/**
 * POST /api/webhook
 *
 * Recebe as notificacoes (webhooks) do Mercado Pago.
 *
 * Importante: em Cloudflare Pages Functions nao existe banco de dados local,
 * entao este handler apenas valida a assinatura (quando MP_WEBHOOK_SECRET esta
 * configurado), consulta o pedido na API e REGISTRA o status no log do
 * deployment (`wrangler pages deployment tail`). Para persistir de verdade,
 * troque o console.log por Cloudflare KV, D1 ou um servico externo.
 *
 * Configure em: Suas integracoes > Aplicacao > Webhooks > URL de producao
 *   https://SEU-DOMINIO.pages.dev/api/webhook
 *   Eventos: "Order" (Orders API) / "Pagamentos"
 */

import { consultarOrdemMP, lerConfiguracao, rotuloStatus } from '../_lib/mercado-pago.js';
import { json, preflight } from '../_lib/respostas.js';

export async function onRequestPost({ request, env }) {
  const config = lerConfiguracao(env);
  const url = new URL(request.url);

  let corpo = null;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }

  // O Mercado Pago envia: { type|topic, action, data: { id } } + ?data.id=
  const tipo = corpo?.type || corpo?.topic || url.searchParams.get('type') || url.searchParams.get('topic');
  const idNotificacao =
    corpo?.data?.id || corpo?.id || url.searchParams.get('data.id') || url.searchParams.get('id');

  const assinatura = request.headers.get('x-signature');
  const requisicaoId = request.headers.get('x-request-id');
  const assinaturaValida = await validarAssinatura({
    secret: config.webhookSecret,
    assinatura,
    requisicaoId,
    dataId: idNotificacao,
  });

  console.log(
    '[webhook] recebido',
    JSON.stringify({
      tipo,
      idNotificacao,
      acao: corpo?.action || null,
      assinatura_presente: Boolean(assinatura),
      assinatura_valida: assinaturaValida,
      simulacao: config.simulacao,
    }),
  );

  if (config.webhookSecret && assinaturaValida === false) {
    return json({ ok: false, erro: 'Assinatura do webhook inválida.' }, 401);
  }

  // Consulta o pedido para registrar o status atualizado.
  if (idNotificacao && !config.simulacao && /^(ORD|PAY)/i.test(String(idNotificacao))) {
    try {
      const ordem = await consultarOrdemMP({ accessToken: config.accessToken, id: String(idNotificacao) });
      const pagamento = ordem?.transactions?.payments?.[0] || {};
      console.log(
        '[webhook] pedido atualizado',
        JSON.stringify({
          id: ordem.id,
          referencia: ordem.external_reference,
          status_pedido: ordem.status,
          status_pagamento: pagamento.status,
          rotulo: rotuloStatus(pagamento.status).rotulo,
          detalhe: pagamento.status_detail,
          valor: ordem.total_amount,
        }),
      );
    } catch (e) {
      console.log('[webhook] falha ao consultar o pedido', idNotificacao, e?.message);
    }
  }

  // Sempre responder 200/201 rapido: o Mercado Pago reenvia em caso de erro.
  return json({
    ok: true,
    recebido: { tipo, id: idNotificacao },
    assinatura_validada: config.webhookSecret ? assinaturaValida : 'nao_configurada',
    observacao:
      'Status registrado no log do deployment. Configure Cloudflare KV/D1 para persistir os pedidos.',
  });
}

export async function onRequestGet() {
  return json({
    ok: true,
    mensagem:
      'Endpoint de webhook ativo. Configure está URL (POST) no painel do Mercado Pago em Suas integracoes > Webhooks.',
  });
}

export async function onRequestOptions() {
  return preflight();
}

/**
 * Valida o cabecalho `x-signature` conforme a documentacao:
 *   ts=<timestamp>,v1=<hmac-sha256>
 * manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 */
async function validarAssinatura({ secret, assinatura, requisicaoId, dataId }) {
  if (!secret) return 'sem_segredo';
  if (!assinatura || !dataId) return false;

  const partes = Object.fromEntries(
    String(assinatura)
      .split(',')
      .map((par) => par.split('=').map((v) => v.trim()))
      .filter(([chave, valor]) => chave && valor),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requisicaoId || ''};ts:${ts};`;
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const assinaturaCalculada = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(assinaturaCalculada)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === v1;
}
