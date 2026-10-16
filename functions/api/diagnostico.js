/**
 * GET /api/diagnostico
 *
 * Checklist de configuracao do Mercado Pago para a loja de teste.
 * Nunca devolve o access token — apenas se ele existe, qual o prefixo
 * (TEST- / APP_USR-) e o resultado do "quem sou eu" na API.
 *
 * Use a pagina /diagnostico.html para uma versao visual deste relatorio.
 */

import { API_BASE, configuracaoPublica, lerConfiguracao, mascarar } from '../_lib/mercado-pago.js';
import { PRODUTOS } from '../_lib/catalogo.js';
import { json, preflight } from '../_lib/respostas.js';

export async function onRequestGet({ env }) {
  const config = lerConfiguracao(env);
  const itens = [];

  itens.push({
    item: 'MP_PUBLIC_KEY',
    status: config.publicKey ? 'ok' : 'pendente',
    mensagem: config.publicKey
      ? `Configurada (${mascarar(config.publicKey)}). Usada no navegador pelo Payment Brick.`
      : 'Ausente. Sem ela o formulário de pagamento (Brick) não renderiza.',
    esperado: 'TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  });

  itens.push({
    item: 'MP_ACCESS_TOKEN',
    status: config.accessToken ? 'ok' : 'pendente',
    mensagem: config.accessToken
      ? `Configurado (${mascarar(config.accessToken)}). Mantido apenas no servidor.`
      : 'Ausente. Sem ele a loja roda em MODO SIMULACAO (nenhum pagamento e processado).',
    esperado: 'TEST-... ou APP_USR-... (Credenciais de teste da sua aplicação)',
  });

  itens.push({
    item: 'Modo de operacao',
    status: config.simulacao ? 'atencao' : config.modoTeste ? 'ok' : 'atencao',
    mensagem: config.simulacao
      ? 'MODO SIMULACAO ativo: nada e enviado ao Mercado Pago.'
      : config.modoTeste
        ? 'MODO DE TESTE: os pagamentos usam suas credenciais de teste (nada e cobrado de verdade).'
        : 'MODO PRODUCAO: as credenciais não parecem de teste. Cuidado ao pagar!',
    esperado: 'auto (detecta pela credencial) ou teste/producao no MP_MODO',
  });

  itens.push({
    item: 'Credencial de teste reconhecida',
    status: config.credencialTeste ? 'ok' : 'atencao',
    mensagem: config.credencialTeste
      ? 'A credencial comeca com TEST- ou foi marcada como teste (MP_CREDENCIAL_TESTE=true).'
      : config.temCredenciais
        ? 'A credencial NAO tem o prefixo TEST-. Se ela veio de "Credenciais de teste", marque MP_CREDENCIAL_TESTE=true para exibir a faixa de aviso.'
        : 'Sem credenciais para avaliar.',
    esperado: 'Credenciais de TESTE do painel > Suas integracoes > Credenciais de teste',
  });

  itens.push({
    item: 'Catálogo carregado',
    status: PRODUTOS.length > 0 ? 'ok' : 'pendente',
    mensagem: `${PRODUTOS.length} produtos de demonstracao disponiveis.`,
    esperado: '>= 1 produto',
  });

  itens.push({
    item: 'Frete simulado',
    status: 'ok',
    mensagem:
      'Cálculo fictício por CEP e peso (econômico, expresso e retirada). Nenhuma transportadora e consultada.',
    esperado: 'Informativo',
  });

  // Teste real da credencial: "quem sou eu" / lista de meios de pagamento.
  let conta = null;
  if (config.accessToken && !config.simulacao) {
    conta = await consultarConta(config.accessToken);
    itens.push({
      item: 'Conexao com a API do Mercado Pago',
      status: conta.ok ? 'ok' : 'erro',
      mensagem: conta.ok
        ? `Autenticacao OK. Conta: ${conta.apelido || conta.email || conta.id} (pais ${conta.pais || 'n/d'}) — ${conta.meios_de_pagamento} meios de pagamento ativos.`
        : `Falha ao autenticar: ${conta.erro}`,
      esperado: 'HTTP 200 do endpoint /users/me',
    });
  } else {
    itens.push({
      item: 'Conexao com a API do Mercado Pago',
      status: 'pendente',
      mensagem: 'Não testado: configure MP_ACCESS_TOKEN (teste) para validar a conexão.',
      esperado: 'HTTP 200 do endpoint /users/me',
    });
  }

  return json({
    ok: true,
    resumo: {
      pronto_para_teste: Boolean(config.temCredenciais) && config.credencialTeste,
      simulacao: config.simulacao,
      modo_teste: config.modoTeste,
      pendencia_critica: config.avisos[0] || null,
    },
    variaveis: configuracaoPublica(config),
    checklist: itens,
    proximos_passos: proximosPassos(config),
    endpoints: {
      criar_pedido: 'POST /api/orders',
      consultar_pedido: 'GET /api/orders/{id}',
      frete: 'POST /api/frete',
      webhook: 'POST /api/webhook',
    },
  });
}

export async function onRequestOptions() {
  return preflight();
}

async function consultarConta(accessToken) {
  try {
    const [respostaUsuario, respostaMeios] = await Promise.all([
      fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${API_BASE}/v1/payment_methods`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!respostaUsuario.ok) {
      const corpo = await respostaUsuario.text();
      return {
        ok: false,
        erro: `HTTP ${respostaUsuario.status} ${corpo.slice(0, 160)}`,
      };
    }

    const usuario = await respostaUsuario.json();
    const meios = respostaMeios.ok ? await respostaMeios.json() : [];

    return {
      ok: true,
      id: usuario?.id,
      apelido: usuario?.nickname,
      email: usuario?.email,
      pais: usuario?.site_id,
      meios_de_pagamento: Array.isArray(meios) ? meios.length : 0,
    };
  } catch (e) {
    return { ok: false, erro: e?.message || 'falha de rede' };
  }
}

function proximosPassos(config) {
  const passos = [];
  if (!config.publicKey || !config.accessToken) {
    passos.push(
      'Cole as credenciais de TESTE: localmente no arquivo .dev.vars (copie de .dev.vars.example) e no Cloudflare Pages em Settings > Variables and Secrets.',
    );
    passos.push('Rode `npm run dev` e abra http://localhost:8788/diagnostico.html para conferir.');
  }
  if (config.simulacao) {
    passos.push('Enquanto estiver em MODO SIMULACAO, os pedidos são fictícios e aparecem marcados como simulado na confirmacao.');
  }
  passos.push('Cadastre compradores de teste (Contas de teste) e use os cartões de teste do Mercado Pago para aprovar/recusar pagamentos.');
  passos.push('Configure a URL de notificacao do webhook: https://SEU-DOMINIO/api/webhook');
  return passos;
}
