/**
 * GET /api/orders/{id}
 *
 * Consulta o pedido no Mercado Pago (GET /v1/orders/{id}) e devolve o status
 * atualizado — usado pela pagina de confirmacao para o "Reconsultar status"
 * (Pix confirmado, boleto pago, cartao em analise etc.).
 *
 * Pedidos simulados (id comecando com "SIM-") sao respondidos localmente.
 */

import {
  consultarOrdemMP,
  lerConfiguracao,
  normalizarPedido,
  reconsultarSimulado,
} from '../../_lib/mercado-pago.js';
import { erro, json, preflight } from '../../_lib/respostas.js';

export async function onRequestGet({ params, request, env }) {
  const config = lerConfiguracao(env);
  const id = String(params?.id || '').trim();

  if (!id) return erro('Informe o id do pedido.', 400, { codigo: 'id_obrigatorio' });

  // Pedido simulado: monta a resposta a partir da loja local (nada no MP).
  if (id.startsWith('SIM-')) {
    const local = lerSimuladoDaQuery(request);
    return json({
      ok: true,
      simulado: true,
      modo_teste: config.modoTeste,
      pedido: reconsultarSimulado(id, local),
    });
  }

  if (config.simulacao) {
    return erro(
      'Não ha credenciais configuradas (modo simulação), portanto este pedido não existe no Mercado Pago. Configure as credenciais de teste para consultar pedidos reais.',
      409,
      { codigo: 'modo_simulacao' },
    );
  }

  try {
    const ordem = await consultarOrdemMP({ accessToken: config.accessToken, id });
    return json({
      ok: true,
      simulado: false,
      modo_teste: config.modoTeste,
      pedido: normalizarPedido(ordem),
    });
  } catch (e) {
    if (e?.credencialInvalida) {
      return erro(
        `As credenciais do Mercado Pago foram recusadas (HTTP ${e.status}). Revise MP_ACCESS_TOKEN em /diagnostico.html.`,
        401,
        { codigo: 'credencial_invalida', detalhes: e.detalhes },
      );
    }
    if (e?.status === 404) {
      return erro(`Pedido não encontrado no Mercado Pago: ${id}`, 404, { codigo: 'pedido_nao_encontrado' });
    }
    return erro(e?.message || 'Falha ao consultar o pedido.', e?.status || 502, {
      codigo: e?.codigo || 'erro_consulta',
      detalhes: e?.detalhes,
    });
  }
}

/**
 * O navegador guarda o pedido simulado no localStorage e reenvia os dados
 * resumidos via query string para a tela de confirmacao continuar coerente.
 */
function lerSimuladoDaQuery(request) {
  const url = new URL(request.url);
  const total = url.searchParams.get('total');
  const subtotal = url.searchParams.get('subtotal');
  const metodo = url.searchParams.get('metodo');
  const parcelas = url.searchParams.get('parcelas');

  return {
    total: total ? Number(total) : 0,
    subtotal: subtotal ? Number(subtotal) : 0,
    // Mantem Pix/boleto/parcelas coerentes na reconsulta do pedido simulado.
    pagamento: metodo
      ? {
          metodo,
          installments: parcelas ? Number(parcelas) : 1,
          payment_method_id: url.searchParams.get('payment_method_id') || undefined,
        }
      : {},
  };
}

export async function onRequestOptions() {
  return preflight();
}
