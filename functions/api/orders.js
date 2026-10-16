/**
 * POST /api/orders
 *
 * Cria o pedido e processa o pagamento no Mercado Pago:
 *   POST https://api.mercadopago.com/v1/orders   (processing_mode: automatic)
 *
 * O navegador envia apenas os IDS/QUANTIDADES dos produtos + o token do cartao
 * gerado pelo Payment Brick. Todo o calculo de valores acontece aqui.
 *
 * Corpo esperado:
 * {
 *   itens: [{ id, quantidade, tamanho }],
 *   frete_id: "economico" | "expresso" | "retirada",
 *   cliente: { nome, email, cpf, telefone },
 *   entrega: { cep, rua, numero, complemento, bairro, cidade, uf },
 *   pagamento: {
 *     metodo: "credit_card" | "debit_card" | "ticket" | "bank_transfer",
 *     payment_method_id, token, installments, issuer_id,
 *     transaction_amount      // opcional, usado para conferencia
 *   },
 *   cenario_simulado: "APRO" | "PEND" | "REJE"   // so no modo simulacao
 * }
 */

import { ErroValidacao, validarItens } from '../_lib/catalogo.js';
import { calcularOpcoesDeFrete, escolherOpcao } from '../_lib/frete.js';
import {
  criarOrdemMP,
  gerarReferenciaExterna,
  lerConfiguracao,
  montarPayloadOrdem,
  normalizarPedido,
  simularPedido,
} from '../_lib/mercado-pago.js';
import { erro, json, lerJson, preflight } from '../_lib/respostas.js';

export async function onRequestPost({ request, env }) {
  const config = lerConfiguracao(env);

  let corpo;
  try {
    corpo = await lerJson(request);
  } catch (e) {
    return erro(e.message, e.status || 400);
  }

  try {
    /* -------------------- 1. Validacoes de dados -------------------- */
    const { itens, subtotal } = validarItens(corpo?.itens, config.maxItens);
    const cliente = validarCliente(corpo?.cliente);
    const entrega = validarEntrega(corpo?.entrega);
    const pagamento = validarPagamento(corpo?.pagamento, config);

    /* -------------------- 2. Frete + total -------------------- */
    const calculoFrete = calcularOpcoesDeFrete({
      cep: entrega.cep,
      itens,
      subtotal,
      freteGratisAcimaDe: config.freteGratisAcimaDe,
    });
    const frete = escolherOpcao(corpo?.frete_id || 'economico', calculoFrete);
    const total = Math.round((subtotal + frete.valor) * 100) / 100;

    const dados = { itens, subtotal, frete, total, cliente, entrega, pagamento, referencia: '' };
    dados.referencia = gerarReferenciaExterna();

    /* -------------------- 3. Modo simulacao -------------------- */
    if (config.simulacao) {
      const pedido = simularPedido({ dados, cenario: normalizarCenario(corpo?.cenario_simulado) });
      return json(
        {
          ok: true,
          simulado: true,
          modo_teste: true,
          aviso:
            'MODO SIMULACAO: nenhuma credencial configurada, portanto NADA foi enviado ao Mercado Pago. Configure MP_PUBLIC_KEY e MP_ACCESS_TOKEN (teste) para processar pagamentos de teste de verdade.',
          pedido,
        },
        201,
      );
    }

    /* -------------------- 4. Mercado Pago (Orders API) -------------------- */
    const url = new URL(request.url);
    const payload = montarPayloadOrdem({
      itens,
      subtotal,
      frete,
      total,
      cliente,
      entrega,
      pagamento,
      referencia: dados.referencia,
      callbackUrl: `${url.origin}/api/webhook`,
      origem: url.origin,
      freteComoItem: config.freteComoItem,
      enviarIssuerId: config.enviarIssuerId,
    });

    const ordem = await criarOrdemMP({
      accessToken: config.accessToken,
      payload,
      idempotencyKey: `${dados.referencia}-${Date.now()}`,
    });

    const pedido = normalizarComExtras(ordem, dados);

    if (!pedido.valor_total || Math.abs(pedido.valor_total - total) > 0.01) {
      // Nao quebra a resposta: apenas registra a divergencia no retorno.
      pedido.aviso_valor = `Total conferido no servidor: R$ ${total.toFixed(2)} | total devolvido pela API: R$ ${Number(pedido.valor_total || 0).toFixed(2)}`;
    }

    return json({ ok: true, simulado: false, modo_teste: config.modoTeste, pedido }, 201);
  } catch (e) {
    return tratarErro(e, config);
  }
}

export async function onRequestOptions() {
  return preflight();
}

/* -------------------------------------------------------------------------- */

function normalizarComExtras(ordem, dados) {
  return normalizarPedido(ordem, {
    itens: dados.itens,
    subtotal: dados.subtotal,
    frete: dados.frete,
  });
}

function validarCliente(clienteBruto) {
  const nome = String(clienteBruto?.nome || '').trim();
  const email = String(clienteBruto?.email || '').trim().toLowerCase();
  const cpf = String(clienteBruto?.cpf || '').replace(/\D/g, '');
  const telefone = String(clienteBruto?.telefone || '').replace(/\D/g, '');

  const problemas = [];
  if (nome.split(/\s+/).filter(Boolean).length < 2) problemas.push('nome completo (nome e sobrenome)');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) problemas.push('e-mail válido');
  if (cpf.length !== 11) problemas.push('CPF com 11 dígitos');
  if (telefone.length < 10) problemas.push('telefone com DDD');

  if (problemas.length) {
    throw new ErroValidacao(`Confira os dados do comprador: informe ${problemas.join(', ')}.`, 'cliente_invalido');
  }

  return { nome, email, cpf, telefone };
}

function validarEntrega(entregaBruta) {
  const cep = String(entregaBruta?.cep || '').replace(/\D/g, '');
  const rua = String(entregaBruta?.rua || '').trim();
  const numero = String(entregaBruta?.numero || '').trim();
  const bairro = String(entregaBruta?.bairro || '').trim();
  const cidade = String(entregaBruta?.cidade || '').trim();
  const uf = String(entregaBruta?.uf || '').trim().toUpperCase();

  const problemas = [];
  if (cep.length !== 8) problemas.push('CEP com 8 dígitos');
  if (!rua) problemas.push('rua');
  if (!numero) problemas.push('numero');
  if (!bairro) problemas.push('bairro');
  if (!cidade) problemas.push('cidade');
  if (!/^[A-Z]{2}$/.test(uf)) problemas.push('UF com 2 letras');

  if (problemas.length) {
    throw new ErroValidacao(`Confira o endereço de entrega: informe ${problemas.join(', ')}.`, 'entrega_invalida');
  }

  return {
    cep,
    rua,
    numero,
    complemento: String(entregaBruta?.complemento || '').trim(),
    bairro,
    cidade,
    uf,
  };
}

function validarPagamento(pagamentoBruto, configAtual) {
  // O Brick informa o tipo real via `additionalData.paymentTypeId`
  // (ex.: credit_card / debit_card). Se vier, ele manda.
  const tipoInformado = String(pagamentoBruto?.payment_type_id || '').trim().toLowerCase();
  const metodoBruto = String(pagamentoBruto?.metodo || '').trim().toLowerCase();
  const tiposValidos = ['credit_card', 'debit_card', 'ticket', 'bank_transfer'];
  const metodo = tiposValidos.includes(tipoInformado) ? tipoInformado : metodoBruto;
  const permitidos = ['credit_card', 'debit_card', 'ticket', 'bank_transfer', 'wallet_purchase'];
  if (!permitidos.includes(metodo)) {
    throw new ErroValidacao(
      'Meio de pagamento não informado. Escolha a forma de pagamento no Brick.',
      'pagamento_invalido',
    );
  }

  const pagamento = {
    metodo,
    payment_method_id: String(pagamentoBruto?.payment_method_id || '').trim() || undefined,
    token: String(pagamentoBruto?.token || '').trim() || undefined,
    installments: Number.parseInt(pagamentoBruto?.installments, 10) || undefined,
    issuer_id: pagamentoBruto?.issuer_id ? String(pagamentoBruto.issuer_id) : undefined,
    financial_institution: pagamentoBruto?.financial_institution
      ? String(pagamentoBruto.financial_institution)
      : undefined,
    transaction_amount: pagamentoBruto?.transaction_amount ?? null,
  };

  // No modo simulacao nao exigimos o token do Brick.
  if (configAtual.simulacao) return pagamento;

  if (metodo === 'credit_card' || metodo === 'debit_card') {
    if (!pagamento.token) {
      throw new ErroValidacao(
        'Token do cartão ausente. Preencha os dados do cartão no formulário do Mercado Pago para gerar o token.',
        'token_ausente',
      );
    }
    if (!pagamento.payment_method_id) {
      throw new ErroValidacao('Não foi possível identificar a bandeira do cartão.', 'bandeira_ausente');
    }
    if (!pagamento.installments) pagamento.installments = 1;
  }

  return pagamento;
}

function normalizarCenario(cenario) {
  const valor = String(cenario || 'APRO').toUpperCase();
  return ['APRO', 'PEND', 'REJE'].includes(valor) ? valor : 'APRO';
}

function tratarErro(e, configAtual) {
  if (e instanceof ErroValidacao) {
    return erro(e.message, 400, { codigo: e.codigo });
  }
  if (e?.codigo === 'frete_invalido') {
    return erro(e.message, 400, { codigo: 'frete_invalido' });
  }
  if (e?.credencialInvalida) {
    return erro(
      `As credenciais do Mercado Pago foram recusadas (HTTP ${e.status}). Confira MP_PUBLIC_KEY e MP_ACCESS_TOKEN em /diagnostico.html.`,
      401,
      {
        codigo: 'credencial_invalida',
        modo_teste: configAtual.modoTeste,
        detalhes: e.detalhes,
      },
    );
  }
  if (e?.status) {
    return erro(e.message, e.status >= 400 && e.status < 600 ? e.status : 502, {
      codigo: e.codigo || 'erro_mercado_pago',
      detalhes: e.detalhes,
      modo_teste: configAtual.modoTeste,
    });
  }
  return erro('Erro inesperado ao criar o pedido.', 500, { detalhes: e?.message });
}
