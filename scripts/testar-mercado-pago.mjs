#!/usr/bin/env node
/**
 * npm run testar:mp
 * ===========================================================================
 * Bateria de testes da integracao com o Mercado Pago usando as credenciais
 * de TESTE configuradas em .dev.vars (ou em variaveis de ambiente).
 *
 * O que este script valida, em ordem:
 *   1. Credenciais carregadas (public key + access token mascarados)
 *   2. GET /users/me ................ access token valido + dados da conta
 *   3. GET /v1/payment_methods ...... meios de pagamento ativos (cartao/pix/boleto)
 *   4. POST /v1/card_tokens ......... public key valida + tokenizacao do cartao
 *   5. POST /v1/orders .............. cria uma ORDEM REAL de teste (Orders API)
 *      usando exatamente o mesmo payload que o site envia em producao
 *      (functions/_lib/mercado-pago.js -> montarPayloadOrdem)
 *   6. GET /v1/orders/{id} .......... reconsulta e normaliza o status igual a
 *      tela de confirmacao faz (normalizarPedido)
 *
 * Cenarios: aprovado | recusado | pendente | pix | boleto  (padrao: todos)
 *
 * Uso:
 *   npm run testar:mp
 *   npm run testar:mp -- --cenario=pix
 *   npm run testar:mp -- --cenario=recusado --verbose
 *   npm run testar:mp -- --cancelar            (cancela pedidos pendentes)
 *   npm run testar:mp -- --frete-como-item     (testa o fallback do frete)
 *
 * Nada aqui e cobrado: as credenciais sao de teste (conta de teste).
 * ===========================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { PRODUTOS, validarItens } from '../functions/_lib/catalogo.js';
import { calcularOpcoesDeFrete } from '../functions/_lib/frete.js';
import {
  montarPayloadOrdem,
  normalizarPedido,
  mascarar,
} from '../functions/_lib/mercado-pago.js';

/* ============================== utilitarios ============================== */

const cores = process.stdout.isTTY && !process.env.NO_COLOR;
const cor = (codigo, texto) => (cores ? `\x1b[${codigo}m${texto}\x1b[0m` : texto);
const negrito = (t) => cor('1', t);
const verde = (t) => cor('32', t);
const amarelo = (t) => cor('33', t);
const vermelho = (t) => cor('31', t);
const ciano = (t) => cor('36', t);
const cinza = (t) => cor('90', t);

const OK = verde('✔');
const ALERTA = amarelo('⚠');
const ERRO = vermelho('✖');
const PONTO = cinza('•');

const titulo = (texto) => console.log(`\n${negrito(texto)}`);
const linha = (simbolo, texto, detalhe = '') =>
  console.log(`  ${simbolo} ${texto}${detalhe ? `\n     ${cinza(detalhe)}` : ''}`);

const brl = (valor) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* =============================== argumentos ============================== */

function argumentos(argv) {
  const opcoes = {
    cenario: 'todos',
    email: null,
    cep: '01310-100',
    produto: 'GZ-1001',
    cancelar: false,
    freteComoItem: false,
    verbose: false,
    webhook: null,
  };
  for (const arg of argv) {
    const [chave, valor] = arg.replace(/^--/, '').split('=');
    switch (chave) {
      case 'cenario':
        opcoes.cenario = valor;
        break;
      case 'email':
        opcoes.email = valor;
        break;
      case 'cep':
        opcoes.cep = valor;
        break;
      case 'produto':
        opcoes.produto = valor;
        break;
      case 'cancelar':
        opcoes.cancelar = true;
        break;
      case 'frete-como-item':
        opcoes.freteComoItem = true;
        break;
      case 'verbose':
        opcoes.verbose = true;
        break;
      case 'webhook':
        opcoes.webhook = valor;
        break;
      case 'help':
      case 'ajuda':
        console.log(`
  npm run testar:mp -- [opcoes]

  --cenario=aprovado|recusado|pendente|pix|boleto|todos   (padrao: todos)
  --email=comprador@testuser.com   e-mail do pagador (padrao: e-mail da conta)
  --cep=01310-100                  CEP usado no frete simulado
  --produto=GZ-1001                SKU que entra no pedido de teste
  --cancelar                       cancela pedidos pendentes ao final
  --frete-como-item                envia o frete como linha de item (fallback)
  --webhook=https://...            envia callback_url no pedido
  --verbose                        mostra o payload completo enviado
`);
        process.exit(0);
        break;
      default:
        break;
    }
  }
  return opcoes;
}

/* ============================ variaveis de ambiente ====================== */

/** Le um .dev.vars simples (KEY="valor" / KEY=valor / # comentario). */
function lerDevVars(caminho = '.dev.vars') {
  if (!fs.existsSync(caminho)) return {};
  const variaveis = {};
  for (const bruto of fs.readFileSync(caminho, 'utf8').split('\n')) {
    const texto = bruto.trim();
    if (!texto || texto.startsWith('#')) continue;
    const igual = texto.indexOf('=');
    if (igual === -1) continue;
    const chave = texto.slice(0, igual).trim();
    let valor = texto.slice(igual + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    variaveis[chave] = valor;
  }
  return variaveis;
}

/* ================================== HTTP ================================= */

const API = 'https://api.mercadopago.com';

async function chamar(caminho, { metodo = 'GET', token, corpo, idempotencia, base = API } = {}) {
  const cabecalhos = { 'Content-Type': 'application/json' };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  if (idempotencia) cabecalhos['X-Idempotency-Key'] = idempotencia;

  let resposta;
  try {
    resposta = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch (e) {
    const erro = new Error(
      `Falha de rede ao chamar ${base}${caminho}: ${e?.message}. Este ambiente pode estar sem saida para api.mercadopago.com.`,
    );
    erro.rede = true;
    throw erro;
  }

  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = { raw: texto };
  }

  if (!resposta.ok) {
    const descricao =
      dados?.message ||
      dados?.error ||
      (Array.isArray(dados?.cause)
        ? dados.cause.map((c) => c?.description || c?.code).filter(Boolean).join(' | ')
        : '') ||
      `HTTP ${resposta.status}`;
    const erro = new Error(descricao);
    erro.status = resposta.status;
    erro.dados = dados;
    throw erro;
  }

  return dados;
}

/* ================================ cenarios =============================== */

const CARTAO_BASE = {
  numero: '5031433215406351', // Mastercard de teste
  mes: '11',
  ano: '2030',
  cvv: '123',
};

const CENARIOS = {
  aprovado: {
    titulo: 'Cartao aprovado',
    pagador: 'APRO',
    metodo: 'credit_card',
    esperado: ['approved', 'processed'],
    como: 'titular APRO',
  },
  recusado: {
    titulo: 'Cartao recusado',
    pagador: 'OTHE',
    metodo: 'credit_card',
    esperado: ['rejected'],
    como: 'titular OTHE',
  },
  pendente: {
    titulo: 'Cartao pendente (analise)',
    pagador: 'CONT',
    metodo: 'credit_card',
    esperado: ['pending', 'in_process'],
    como: 'titular CONT',
  },
  pix: {
    titulo: 'Pix (gera QR Code)',
    metodo: 'bank_transfer',
    esperado: ['pending', 'approved'],
    como: 'sem token de cartao',
  },
  boleto: {
    titulo: 'Boleto (gera linha digitavel)',
    metodo: 'ticket',
    esperado: ['pending', 'approved'],
    como: 'sem token de cartao',
  },
};

/* ================================== main ================================ */

const opcoes = argumentos(process.argv.slice(2));
const doDevVars = lerDevVars();
const env = { ...doDevVars, ...process.env };

const publicKey = env.MP_PUBLIC_KEY || env.MERCADO_PAGO_PUBLIC_KEY || '';
const accessToken = env.MP_ACCESS_TOKEN || env.MERCADO_PAGO_ACCESS_TOKEN || '';

const resumo = [];

async function main() {
  console.log(negrito('\n  TESTE DA API DO MERCADO PAGO — GRIFES Zequinha'));
  console.log(cinza('  ' + '─'.repeat(62)));
  console.log(cinza('  Ambientes aceitos: sua maquina (local) ou Cloudflare Pages.'));
  console.log(cinza('  Este script NAO funciona em sandboxes sem saida para api.mercadopago.com.'));

  /* -------------------- 1. credenciais -------------------- */
  titulo('1. Credenciais carregadas (.dev.vars / variaveis de ambiente)');
  if (!publicKey || !accessToken) {
    linha(
      ERRO,
      'Faltam credenciais.',
      'Defina MP_PUBLIC_KEY e MP_ACCESS_TOKEN em .dev.vars (copie de .dev.vars.example).',
    );
    process.exit(1);
  }
  linha(OK, `MP_PUBLIC_KEY    ${mascarar(publicKey)}`, 'usada pelo Payment Brick no navegador');
  linha(OK, `MP_ACCESS_TOKEN  ${mascarar(accessToken)}`, 'usado somente no backend (nunca no navegador)');
  if (publicKey.startsWith('APP_USR-') || accessToken.startsWith('APP_USR-')) {
    linha(
      ALERTA,
      'Credenciais com prefixo APP_USR-.',
      'Se a aplicacao pertence a uma conta de teste, sao credenciais de teste (mantenha MP_CREDENCIAL_TESTE=true).',
    );
  }

  /* -------------------- 2. /users/me -------------------- */
  titulo('2. Access token — GET /users/me');
  let conta = null;
  try {
    conta = await chamar('/users/me', { token: accessToken });
    linha(
      OK,
      `Token valido. Conta: ${conta.nickname || conta.email} (id ${conta.id}, pais ${conta.site_id})`,
      `e-mail: ${conta.email} · tipo: ${conta.type || 'n/d'} · teste: ${ehContaDeTeste(conta) ? 'sim' : 'nao identificado'}`,
    );
    resumo.push({ passo: 'GET /users/me', resultado: 'ok', detalhe: String(conta.id) });
  } catch (e) {
    linha(ERRO, `Falha ao autenticar: ${e.message}`, e.rede ? 'Ambiente sem saida de rede.' : 'Confira o ACCESS TOKEN no painel > Credenciais de teste.');
    resumo.push({ passo: 'GET /users/me', resultado: 'erro', detalhe: e.message });
    imprimirResumo();
    process.exit(1);
  }

  const emailPagador = opcoes.email || env.MP_EMAIL_COMPRADOR_TESTE || conta.email;
  console.log(cinza(`     pagador dos testes: ${emailPagador}`));

  /* -------------------- 3. meios de pagamento -------------------- */
  titulo('3. Meios de pagamento ativos — GET /v1/payment_methods');
  try {
    const meios = await chamar('/v1/payment_methods', { token: accessToken });
    const ids = (Array.isArray(meios) ? meios : []).map((m) => m.id);
    const interessantes = [
      ['visa', 'Cartao Visa'],
      ['master', 'Cartao Mastercard'],
      ['pix', 'Pix'],
      ['bolbradesco', 'Boleto Bradesco'],
    ];
    for (const [id, rotulo] of interessantes) {
      linha(ids.includes(id) ? OK : ALERTA, `${rotulo} (${id})`, ids.includes(id) ? '' : 'nao retornado para esta conta');
    }
    linha(PONTO, `${ids.length} meios de pagamento no total.`);
    resumo.push({ passo: 'GET /v1/payment_methods', resultado: 'ok', detalhe: `${ids.length} meios` });
  } catch (e) {
    linha(ERRO, `Falha ao listar meios de pagamento: ${e.message}`);
    resumo.push({ passo: 'GET /v1/payment_methods', resultado: 'erro', detalhe: e.message });
  }

  /* -------------------- 4 a 6. cenarios -------------------- */
  const lista = opcoes.cenario === 'todos' ? Object.keys(CENARIOS) : [String(opcoes.cenario).toLowerCase()];
  const invalidos = lista.filter((c) => !CENARIOS[c]);
  if (invalidos.length) {
    linha(ERRO, `Cenario(s) invalido(s): ${invalidos.join(', ')}`, `Validos: ${Object.keys(CENARIOS).join(', ')}, todos`);
    process.exit(1);
  }

  for (const nome of lista) {
    await testarCenario(nome, { publicKey, accessToken, emailPagador, opcoes, conta });
  }

  imprimirResumo();
  console.log(`\n  ${negrito('Proximo passo:')} rode ${ciano('npm run dev')} e pague com os cartoes de teste no site`);
  console.log(cinza('  (titular APRO aprova, OTHE recusa, CONT deixa pendente).\n'));
}

function ehContaDeTeste(conta) {
  return /^TESTUSER/i.test(conta?.nickname || '') || /@testuser\.com$/i.test(conta?.email || '');
}

async function testarCenario(nome, { publicKey, accessToken, emailPagador, opcoes, conta }) {
  const cenario = CENARIOS[nome];
  titulo(`Cenario: ${cenario.titulo} (${cenario.como})`);

  /* 4. token do cartao (quando for cartao) */
  let token = null;
  if (cenario.metodo === 'credit_card') {
    try {
      const respostaToken = await chamar(`/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`, {
        metodo: 'POST',
        corpo: {
          card_number: CARTAO_BASE.numero,
          expiration_month: CARTAO_BASE.mes,
          expiration_year: CARTAO_BASE.ano,
          security_code: CARTAO_BASE.cvv,
          cardholder: {
            name: cenario.pagador,
            identification: { type: 'CPF', number: '12345678909' },
          },
        },
      });
      token = respostaToken?.id;
      linha(
        token ? OK : ERRO,
        `Card token gerado com a public key: ${token ? `${String(token).slice(0, 14)}...` : 'sem id'}`,
        `live_mode: ${respostaToken?.live_mode === false ? 'false (teste)' : respostaToken?.live_mode} · final do cartao ${respostaToken?.last_four_digits || '????'}`,
      );
      resumo.push({ passo: `POST /v1/card_tokens (${nome})`, resultado: token ? 'ok' : 'erro', detalhe: '' });
    } catch (e) {
      linha(
        ERRO,
        `Falha ao tokenizar o cartao: ${e.message}`,
        'Confira a MP_PUBLIC_KEY (Credenciais de teste) e se o numero do cartao de teste esta correto.',
      );
      resumo.push({ passo: `POST /v1/card_tokens (${nome})`, resultado: 'erro', detalhe: e.message });
      return;
    }
  }

  /* 5. pedido real no Orders API, com o payload do projeto */
  const pedidoBase = montarPedidoLocal(opcoes);
  const referencia = `GZ-TESTE-${nome.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const payload = montarPayloadOrdem({
    itens: pedidoBase.itens,
    subtotal: pedidoBase.subtotal,
    frete: pedidoBase.frete,
    total: pedidoBase.total,
    cliente: pedidoBase.cliente(emailPagador, conta),
    entrega: pedidoBase.entrega,
    pagamento: {
      metodo: cenario.metodo,
      token,
      payment_method_id: cenario.metodo === 'credit_card' ? 'master' : undefined,
      installments: cenario.metodo === 'credit_card' ? 1 : undefined,
    },
    referencia,
    callbackUrl: opcoes.webhook,
    origem: 'https://grifes-zequinha.pages.dev',
    freteComoItem: opcoes.freteComoItem,
  });

  if (opcoes.verbose) {
    console.log(cinza('     payload POST /v1/orders:'));
    console.log(cinza(JSON.stringify(payload, null, 2).split('\n').map((l) => `       ${l}`).join('\n')));
  }

  let ordem = null;
  try {
    ordem = await chamar('/v1/orders', {
      metodo: 'POST',
      token: accessToken,
      corpo: payload,
      idempotencia: `${referencia}-${Math.random().toString(36).slice(2, 10)}`,
    });
    linha(
      OK,
      `Ordem criada: ${ordem.id}`,
      `status ${ordem.status}/${ordem.status_detail} · total ${brl(ordem.total_amount)} · referencia ${ordem.external_reference}`,
    );
    resumo.push({ passo: `POST /v1/orders (${nome})`, resultado: 'ok', detalhe: `${ordem.id}` });
  } catch (e) {
    const dica = dicaDeErro(e);
    linha(ERRO, `Orders API recusou a criacao: ${e.message}`, dica);
    resumo.push({ passo: `POST /v1/orders (${nome})`, resultado: 'erro', detalhe: e.message });
    return;
  }

  /* 6. reconsulta + normalizacao (igual a tela de confirmacao) */
  try {
    const consulta = await chamar(`/v1/orders/${ordem.id}`, { token: accessToken });
    const normalizado = normalizarPedido(consulta, {
      itens: pedidoBase.itens,
      subtotal: pedidoBase.subtotal,
      frete: pedidoBase.frete,
    });

    linha(
      OK,
      `GET /v1/orders/{id} -> "${normalizado.status_rotulo}"`,
      normalizado.status_descricao + (normalizado.status_detalhe ? ` · status_detail: ${normalizado.status_detalhe}` : ''),
    );
    if (normalizado.pagamento?.pix?.codigo_copia_e_cola) {
      linha(OK, 'QR Code do Pix disponivel', `copia e cola: ${normalizado.pagamento.pix.codigo_copia_e_cola.slice(0, 48)}...`);
    }
    if (normalizado.pagamento?.boleto) {
      linha(OK, 'Boleto com linha digitavel', normalizado.pagamento.boleto.linha_digitavel || normalizado.pagamento.boleto.url || '');
    }

    const status = normalizado.status;
    const esperado = cenario.esperado.some((s) => s === status);
    linha(
      esperado ? OK : ALERTA,
      esperado
        ? `Resultado compativel com o cenario "${nome}" (status ${status}).`
        : `Resultado "${status}" difere do esperado (${cenario.esperado.join(' ou ')}) para o cenario "${nome}".`,
    );
    resumo.push({
      passo: `status final (${nome})`,
      resultado: esperado ? 'ok' : 'atencao',
      detalhe: `${status}/${normalizado.status_detalhe || '-'}`,
    });

    /* cancelamento opcional de pedidos pendentes */
    if (opcoes.cancelar && ['pending', 'in_process'].includes(status)) {
      try {
        await chamar(`/v1/orders/${ordem.id}/cancel`, { metodo: 'POST', token: accessToken });
        linha(OK, 'Pedido pendente cancelado (--cancelar).');
      } catch (e) {
        linha(ALERTA, `Nao foi possivel cancelar o pedido: ${e.message}`);
      }
    }
  } catch (e) {
    linha(ERRO, `Falha ao reconsultar a ordem: ${e.message}`);
    resumo.push({ passo: `GET /v1/orders/{id} (${nome})`, resultado: 'erro', detalhe: e.message });
  }
}

/** Monta carrinho/frete/clientes de teste reaproveitando as funcoes da loja. */
function montarPedidoLocal(opcoes) {
  const produto = PRODUTOS.find((p) => p.id === opcoes.produto) || PRODUTOS[0];
  const { itens, subtotal } = validarItens([
    { id: produto.id, quantidade: 1, tamanho: produto.tamanhos[0] },
  ]);
  const calculo = calcularOpcoesDeFrete({
    cep: opcoes.cep,
    itens,
    subtotal,
    freteGratisAcimaDe: 299.9,
  });
  const frete = calculo.opcoes.find((o) => o.id === 'economico') || calculo.opcoes[0];
  const total = Math.round((subtotal + frete.valor) * 100) / 100;

  return {
    itens,
    subtotal,
    frete,
    total,
    entrega: {
      cep: calculo.cep,
      rua: 'Av. Paulista',
      numero: '1500',
      complemento: 'Apto 42',
      bairro: 'Bela Vista',
      cidade: 'Sao Paulo',
      uf: 'SP',
    },
    cliente(email, conta) {
      return {
        nome: 'Comprador de Teste',
        email,
        cpf: '12345678909',
        telefone: '11999998888',
      };
    },
  };
}

function dicaDeErro(e) {
  const causa = JSON.stringify(e?.dados?.cause || '').toLowerCase();
  const mensagem = String(e?.message || '').toLowerCase();
  if (e?.rede) {
    return 'Este ambiente nao alcanca api.mercadopago.com (rede/proxy bloqueado). Rode de novo na sua maquina ou no Cloudflare Pages.';
  }
  if (e?.status === 401 || e?.status === 403) {
    return 'Access token recusado. Copie novamente em Painel do Mercado Pago > Suas integracoes > sua aplicacao > Credenciais de teste.';
  }
  if (mensagem.includes('shipment') || causa.includes('shipment') || mensagem.includes('shipping')) {
    return 'Erro de envio (shipment): rode com --frete-como-item para mandar o frete como linha de item.';
  }
  if (mensagem.includes('payer') || causa.includes('payer')) {
    return 'Erro de pagador: confira --email (use o e-mail do usuario de teste, ex.: test_user_...@testuser.com) e um CPF valido.';
  }
  if (mensagem.includes('token') || causa.includes('token')) {
    return 'Token do cartao invalido/expirado. Gere um novo cartao de teste (o token dura 7 dias e e de uso unico).';
  }
  return 'Veja o objeto completo do erro com --verbose.';
}

function imprimirResumo() {
  titulo('Resumo dos testes');
  const largura = Math.max(...resumo.map((r) => r.passo.length), 20);
  for (const item of resumo) {
    const simbolo = item.resultado === 'ok' ? OK : item.resultado === 'atencao' ? ALERTA : ERRO;
    console.log(`  ${simbolo} ${item.passo.padEnd(largura)}  ${cinza(item.detalhe || '')}`);
  }
  const erros = resumo.filter((r) => r.resultado === 'erro').length;
  const ok = resumo.filter((r) => r.resultado === 'ok').length;
  console.log(cinza('  ' + '─'.repeat(62)));
  console.log(`  ${ok} passo(s) OK · ${erros} erro(s)`);
}

main().catch((e) => {
  console.error(`\n  ${ERRO} Erro inesperado: ${e?.stack || e?.message}`);
  process.exit(1);
});
