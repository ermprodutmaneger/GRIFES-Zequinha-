/**
 * ---------------------------------------------------------------------------
 * Integracao com o Mercado Pago — Checkout Transparente + API Orders
 * ---------------------------------------------------------------------------
 * Endpoints usados:
 *   POST https://api.mercadopago.com/v1/orders       (cria e processa o pagamento)
 *   GET  https://api.mercadopago.com/v1/orders/{id}  (consulta o status)
 *
 * Regras de ouro aplicadas aqui:
 *  1. O ACCESS_TOKEN so existe no servidor (Pages Functions). Nunca e devolvido
 *     ao navegador — apenas a PUBLIC_KEY (que e publica por definicao).
 *  2. Todo valor cobrado e recalculado no servidor a partir do catalogo.
 *     O `formData` do Brick e usado para pegar o TOKEN do cartao e os dados do
 *     pagador, nunca o preco.
 *  3. Sem credenciais configuradas a loja entra em MODO SIMULACAO e deixa isso
 *     explicito na interface (nada e enviado ao Mercado Pago).
 */

import { arredondar, paraValorMP } from './catalogo.js';

export const API_BASE = 'https://api.mercadopago.com';

/** Aceita tanto MP_PUBLIC_KEY/MP_ACCESS_TOKEN quanto os nomes legados. */
const NOMES_PUBLIC_KEY = ['MP_PUBLIC_KEY', 'MERCADO_PAGO_PUBLIC_KEY', 'PUBLIC_KEY', 'VITE_MP_PUBLIC_KEY'];
const NOMES_ACCESS_TOKEN = ['MP_ACCESS_TOKEN', 'MERCADO_PAGO_ACCESS_TOKEN', 'ACCESS_TOKEN', 'MP_ACCESS_TOKEN_TESTE'];

function primeiraVariavel(env, nomes) {
  for (const nome of nomes) {
    const valor = env?.[nome];
    if (valor && String(valor).trim()) return String(valor).trim();
  }
  return '';
}

/**
 * Le e interpreta as variaveis de ambiente.
 *
 * @param {Record<string,string|undefined>} env
 */
export function lerConfiguracao(env = {}) {
  const publicKey = primeiraVariavel(env, NOMES_PUBLIC_KEY);
  const accessToken = primeiraVariavel(env, NOMES_ACCESS_TOKEN);
  const modoBruto = String(env.MP_MODO || 'auto').toLowerCase();
  const simulacaoForcada = String(env.MP_SIMULACAO || '').toLowerCase() === 'true';

  const temPublicKey = publicKey.length > 0;
  const temAccessToken = accessToken.length > 0;
  const temCredenciais = temPublicKey && temAccessToken;

  // Credencial de teste? (TEST-... ou APP_USR-... vindo de "Credenciais de teste")
  const credencialTeste =
    publicKey.startsWith('TEST-') ||
    accessToken.startsWith('TEST-') ||
    /(^|-)TEST-/.test(accessToken) ||
    String(env.MP_CREDENCIAL_TESTE || '').toLowerCase() === 'true';

  // Modo simulacao: nada sai para o Mercado Pago.
  const simulacao = simulacaoForcada || !temCredenciais;

  // A faixa "MODO DE TESTE" aparece se algo aponta para teste/simulacao.
  let modoTeste = simulacao || credencialTeste || modoBruto === 'teste';
  if (modoBruto === 'producao' && !simulacao && !credencialTeste) modoTeste = false;

  const avisos = [];
  if (!temCredenciais) {
    avisos.push(
      'Credenciais do Mercado Pago não configuradas. A loja está em MODO SIMULACAO: nenhum pagamento real ou de teste e processado pelo Mercado Pago.',
    );
  }
  if (temPublicKey && !temAccessToken) {
    avisos.push('MP_PUBLIC_KEY definida, mas MP_ACCESS_TOKEN está ausente (o token e obrigatório para criar o pedido no backend).');
  }
  if (temAccessToken && !temPublicKey) {
    avisos.push('MP_ACCESS_TOKEN definido, mas MP_PUBLIC_KEY está ausente (a public key e obrigatoria para renderizar o Payment Brick).');
  }
  if (credencialTeste && modoBruto === 'producao') {
    avisos.push('MP_MODO=producao, porem as credenciais parecem ser de TESTE. A faixa de aviso será mantida.');
  }

  return {
    publicKey,
    accessToken,
    temCredenciais,
    credencialTeste,
    simulacao,
    modoTeste,
    modo: modoBruto,
    lojaNome: String(env.MP_LOJA_NOME || 'GRIFES Zequinha'),
    maxItens: Number.parseInt(env.MP_MAX_ITENS_POR_PEDIDO || '10', 10) || 10,
    freteGratisAcimaDe: Number.parseFloat(env.MP_FRETE_GRATIS_ACIMA_DE || '299.90') || 299.9,
    freteComoItem: String(env.MP_FRETE_COMO_ITEM || '').toLowerCase() === 'true',
    enviarIssuerId: String(env.MP_ENVIAR_ISSUER_ID || '').toLowerCase() === 'true',
    webhookSecret: String(env.MP_WEBHOOK_SECRET || ''),
    avisos,
  };
}

/**
 * Informacoes seguras para expor ao navegador (sem segredos).
 * @param {ReturnType<typeof lerConfiguracao>} config
 */
export function configuracaoPublica(config) {
  return {
    public_key: config.publicKey || null,
    access_token_configurado: config.temCredenciais,
    modo_teste: config.modoTeste,
    simulacao: config.simulacao,
    credencial_teste: config.credencialTeste,
    modo: config.modo,
    loja: config.lojaNome,
    avisos: config.avisos,
    // Ajuda a tela de diagnostico a orientar o lojista, sem vazar o segredo.
    access_token_mascarado: mascarar(config.accessToken),
    public_key_mascarada: mascarar(config.publicKey),
  };
}

/**
 * Mostra apenas o comeco/fim de uma credencial (para conferir qual chave
 * esta no ar sem expo-la).
 * @param {string} valor
 */
export function mascarar(valor) {
  if (!valor) return null;
  if (valor.length <= 12) return `${valor.slice(0, 4)}****`;
  return `${valor.slice(0, 8)}...${valor.slice(-4)}`;
}

/** Referencia externa do pedido (max. 64 caracteres na API). */
export function gerarReferenciaExterna() {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10).replace(/-/g, '');
  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GZ-${data}-${aleatorio}`;
}

/**
 * Monta o corpo (body) da requisicao POST /v1/orders.
 *
 * @param {object} params
 * @param {Array<object>} params.itens      Itens validados (catalogo)
 * @param {number} params.subtotal          Subtotal em BRL
 * @param {object} params.frete             Opcao de frete escolhida (do calculo simulado)
 * @param {number} params.total             Total em BRL (itens + frete)
 * @param {object} params.cliente           { nome, email, cpf, telefone }
 * @param {object} params.entrega           { cep, rua, numero, complemento, bairro, cidade, uf }
 * @param {object} params.pagamento         { metodo, token, installments, issuer_id, payment_method_id }
 * @param {string} params.referencia        Referencia externa
 * @param {string} [params.callbackUrl]     URL de notificacao (webhook)
 * @param {string} [params.origem]          Origem do site (para picture_url)
 * @param {boolean} [params.freteComoItem]  true => frete entra como linha de item
 * @param {boolean} [params.enviarIssuerId]  true => envia issuer_id dentro de payment_method
 * @returns {object}
 */
export function montarPayloadOrdem({
  itens,
  subtotal,
  frete,
  total,
  cliente,
  entrega,
  pagamento,
  referencia,
  callbackUrl,
  origem = '',
  freteComoItem = false,
  enviarIssuerId = false,
}) {
  const nomeCompleto = String(cliente?.nome || '').trim();
  const [primeiroNome, ...resto] = nomeCompleto.split(/\s+/);
  const sobrenome = resto.join(' ');

  const itensMP = itens.map((item) => ({
    title: `${item.nome} (Tam. ${item.tamanho})`,
    description: `${item.categoria} — ${item.nome}`,
    unit_price: paraValorMP(item.preco_unitario),
    quantity: item.quantidade,
    external_code: item.id,
    unit_measure: 'unit',
    category_id: 'fashion',
    picture_url: origem ? `${origem}${item.imagem}` : undefined,
  }));

  // Soma de itens + frete precisa bater com total_amount e com o valor
  // processado. Por padrao o frete vai no objeto `shipment`; se o Mercado Pago
  // recusar a combinacao, defina MP_FRETE_COMO_ITEM="true" para que o frete
  // vire uma linha de item (o total nao muda em nenhum dos casos).
  if (freteComoItem && frete.valor > 0) {
    itensMP.push({
      title: `Frete — ${frete.nome}`,
      description: `Entrega simulada para ${entrega.cep} (${frete.prazo_texto})`,
      unit_price: paraValorMP(frete.valor),
      quantity: 1,
      external_code: `FRETE-${frete.id}`,
      unit_measure: 'unit',
      category_id: 'shipping',
    });
  }

  const metodo = String(pagamento?.metodo || '').toLowerCase();
  const payment_method = {
    id: pagamento?.payment_method_id || mapaMetodoPadrao(metodo),
    type: mapaTipoMetodo(metodo),
  };
  if (pagamento?.token) payment_method.token = pagamento.token;
  if (pagamento?.installments) payment_method.installments = Number(pagamento.installments);
  // A Orders API resolve o emissor pelo proprio token. Alguns casos exigem o
  // issuer_id explicito: ative com MP_ENVIAR_ISSUER_ID=true.
  if (enviarIssuerId && pagamento?.issuer_id) payment_method.issuer_id = String(pagamento.issuer_id);
  payment_method.statement_descriptor = 'GRIFESZEQ';
  if (pagamento?.financial_institution) payment_method.financial_institution = pagamento.financial_institution;

  const payload = {
    type: 'online',
    processing_mode: 'automatic',
    capture_mode: 'automatic_async',
    total_amount: paraValorMP(total),
    description: `Pedido ${referencia} — GRIFES Zequinha`,
    external_reference: referencia,
    currency: 'BRL',
    payer: {
      entity_type: 'individual',
      email: String(cliente?.email || '').trim().toLowerCase(),
      first_name: primeiroNome || 'Cliente',
      last_name: sobrenome || 'GRIFES Zequinha',
      identification: {
        type: 'CPF',
        number: String(cliente?.cpf || '').replace(/\D/g, ''),
      },
      phone: telefoneParaMP(cliente?.telefone),
      address: {
        zip_code: String(entrega?.cep || '').replace(/\D/g, ''),
        street_name: entrega?.rua,
        street_number: String(entrega?.numero || ''),
        neighborhood: entrega?.bairro,
        city: entrega?.cidade,
        state: entrega?.uf,
        complement: entrega?.complemento || undefined,
        country: 'BR',
      },
    },
    items: itensMP,
    shipment: {
      mode: 'custom',
      cost: paraValorMP(frete.valor),
      free_shipping: frete.valor === 0,
      address: {
        zip_code: String(entrega?.cep || '').replace(/\D/g, ''),
        street_name: entrega?.rua,
        street_number: String(entrega?.numero || ''),
        neighborhood: entrega?.bairro,
        city: entrega?.cidade,
        state: entrega?.uf,
        complement: entrega?.complemento || undefined,
        country: 'BR',
      },
    },
    transactions: {
      payments: [
        {
          amount: paraValorMP(total),
          payment_method,
        },
      ],
    },
    additional_info: {
      subtotal: paraValorMP(subtotal),
      frete: paraValorMP(frete.valor),
      modalidade_frete: frete.id,
      peso_kg: frete.peso_kg ?? undefined,
      itens: itens.map((i) => ({ id: i.id, tamanho: i.tamanho, qtd: i.quantidade })),
      loja: 'Loja de demonstracao GRIFES Zequinha',
    },
  };

  if (callbackUrl && callbackUrl.startsWith('https://')) {
    payload.config = { online: { callback_url: callbackUrl } };
  }

  return payload;
}

function mapaTipoMetodo(metodo) {
  switch (metodo) {
    case 'credit_card':
    case 'cartao_credito':
      return 'credit_card';
    case 'debit_card':
    case 'cartao_debito':
      return 'debit_card';
    case 'ticket':
    case 'boleto':
      return 'ticket';
    case 'bank_transfer':
    case 'pix':
      return 'bank_transfer';
    case 'wallet_purchase':
    case 'account_money':
      return 'wallet';
    default:
      return metodo || 'credit_card';
  }
}

function mapaMetodoPadrao(metodo) {
  switch (metodo) {
    case 'ticket':
    case 'boleto':
      return 'bolbradesco';
    case 'bank_transfer':
    case 'pix':
      return 'pix';
    case 'wallet_purchase':
      return 'account_money';
    default:
      return undefined;
  }
}

function telefoneParaMP(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '');
  if (digitos.length < 10) return undefined;
  return { area_code: digitos.slice(0, 2), number: digitos.slice(2) };
}

/**
 * POST /v1/orders — cria o pedido e processa o pagamento (automatic mode).
 *
 * @param {object} params
 * @param {string} params.accessToken
 * @param {object} params.payload
 * @param {string} [params.idempotencyKey]
 */
export async function criarOrdemMP({ accessToken, payload, idempotencyKey }) {
  const resposta = await pedir(`${API_BASE}/v1/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey || crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
  return tratarResposta(resposta, 'criar ordem');
}

/** fetch com mensagem de erro clara quando a rede/proxy bloqueia o Mercado Pago. */
async function pedir(url, opcoes) {
  try {
    return await fetch(url, opcoes);
  } catch (e) {
    const erro = new Error(
      `Falha de rede ao falar com o Mercado Pago (${url}): ${e?.message}. Verifique a conexão do ambiente e se api.mercadopago.com está liberado.`,
    );
    erro.codigo = 'falha_rede';
    erro.status = 503;
    throw erro;
  }
}

/**
 * GET /v1/orders/{id} — consulta status/pagamentos do pedido.
 */
export async function consultarOrdemMP({ accessToken, id }) {
  const resposta = await pedir(`${API_BASE}/v1/orders/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return tratarResposta(resposta, 'consultar ordem');
}

async function tratarResposta(resposta, operacao) {
  const texto = await resposta.text();
  let corpo = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    corpo = { raw: texto };
  }

  if (!resposta.ok) {
    const detalhe =
      corpo?.message ||
      corpo?.error ||
      (Array.isArray(corpo?.cause) ? corpo.cause.map((c) => c?.description || c?.code).filter(Boolean).join(' | ') : '') ||
      `HTTP ${resposta.status}`;
    const erro = new Error(`Mercado Pago recusou ${operacao}: ${detalhe}`);
    erro.status = resposta.status;
    erro.codigo = corpo?.error || `http_${resposta.status}`;
    erro.detalhes = corpo;
    erro.credencialInvalida = resposta.status === 401 || resposta.status === 403;
    throw erro;
  }

  return corpo;
}

/* ------------------------------------------------------------------------- */
/* Normalizacao das respostas para o formato usado pelo site                 */
/* ------------------------------------------------------------------------- */

const ROTULOS_STATUS = {
  approved: { rotulo: 'Pagamento aprovado', tom: 'sucesso', descricao: 'O pagamento foi aprovado pelo Mercado Pago.' },
  authorized: { rotulo: 'Pagamento autorizado', tom: 'sucesso', descricao: 'Pagamento autorizado e aguardando captura.' },
  in_process: { rotulo: 'Pagamento em análise', tom: 'atencao', descricao: 'O Mercado Pago está analisando o pagamento.' },
  pending: { rotulo: 'Pagamento pendente', tom: 'atencao', descricao: 'Aguardando o pagamento (Pix ou boleto).' },
  pending_waiting_payment: { rotulo: 'Aguardando pagamento', tom: 'atencao', descricao: 'Pix/boleto gerado e aguardando pagamento.' },
  pending_waiting_transfer: { rotulo: 'Aguardando transferência', tom: 'atencao', descricao: 'Aguardando a conclusão do Pix.' },
  rejected: { rotulo: 'Pagamento recusado', tom: 'erro', descricao: 'O pagamento foi recusado. Tente outro cartão ou outro meio.' },
  cancelled: { rotulo: 'Pagamento cancelado', tom: 'erro', descricao: 'O pagamento foi cancelado.' },
  failed: { rotulo: 'Falha no pagamento', tom: 'erro', descricao: 'Não foi possível processar o pagamento.' },
  refunded: { rotulo: 'Pagamento estornado', tom: 'neutro', descricao: 'O valor foi estornado.' },
  charged_back: { rotulo: 'Contestação (chargeback)', tom: 'erro', descricao: 'O pagamento foi contestado pelo comprador.' },
  created: { rotulo: 'Pedido criado', tom: 'atencao', descricao: 'Pedido criado e aguardando processamento.' },
  processed: { rotulo: 'Pedido processado', tom: 'sucesso', descricao: 'Pedido processado com sucesso.' },
  action_required: { rotulo: 'Ação necessaria', tom: 'atencao', descricao: 'O banco emissor pediu uma validação extra (3-D Secure).' },
  expired: { rotulo: 'Pedido expirado', tom: 'neutro', descricao: 'O prazo de pagamento expirou.' },
};

/**
 * Traduz um status do Mercado Pago para o texto usado na interface.
 * @param {string} status
 */
export function rotuloStatus(status) {
  return (
    ROTULOS_STATUS[String(status || '').toLowerCase()] || {
      rotulo: status ? `Status: ${status}` : 'Status desconhecido',
      tom: 'neutro',
      descricao: '',
    }
  );
}

/**
 * Converte a resposta da Orders API no objeto enxuto que o site consome.
 *
 * @param {object} ordem        Resposta bruta do Mercado Pago
 * @param {object} [extras]     { simulado, itens, subtotal, frete }
 */
export function normalizarPedido(ordem = {}, extras = {}) {
  const pagamentos = ordem?.transactions?.payments || [];
  const pagamento = pagamentos[0] || {};
  const estornos = ordem?.transactions?.refunds || [];

  const statusPagamento = pagamento.status || ordem.status || 'created';
  const info = rotuloStatus(statusPagamento);

  const metodo = pagamento.payment_method || {};
  const pix =
    metodo.qr_code || metodo.qr_code_base64
      ? { codigo_copia_e_cola: metodo.qr_code || null, imagem_base64: metodo.qr_code_base64 || null }
      : null;
  const boleto = metodo.ticket_url || metodo.digitable_line
    ? { url: metodo.ticket_url || null, linha_digitavel: metodo.digitable_line || null, codigo_barras: metodo.barcode_content || null }
    : null;

  return {
    ok: true,
    simulado: Boolean(extras.simulado),
    id: ordem.id || null,
    referencia_externa: ordem.external_reference || null,
    status: statusPagamento,
    status_pedido: ordem.status || null,
    status_rotulo: info.rotulo,
    status_tom: info.tom,
    status_descricao: info.descricao,
    status_detalhe: pagamento.status_detail || ordem.status_detail || null,
    valor_total: ordem.total_amount ? Number(ordem.total_amount) : null,
    valor_pago: ordem.total_paid_amount ? Number(ordem.total_paid_amount) : Number(pagamento.paid_amount || 0),
    moeda: ordem.currency || 'BRL',
    criado_em: ordem.created_date || null,
    atualizado_em: ordem.last_updated_date || null,
    cliente_email: ordem?.payer?.email || null,
    pagamento: {
      id: pagamento.id || null,
      status: pagamento.status || null,
      status_detalhe: pagamento.status_detail || null,
      metodo_id: metodo.id || null,
      metodo_tipo: metodo.type || null,
      parcelas: metodo.installments || null,
      valor_parcela: metodo.installment_amount ? Number(metodo.installment_amount) : null,
      pix,
      boleto,
      redirect_url: metodo.redirect_url || null,
      requer_3ds: Boolean(metodo.redirect_url) || pagamento.status_detail === 'pending_challenge',
      estorno: estornos.length ? { total: estornos.length, valor: estornos[0]?.amount ? Number(estornos[0].amount) : null } : null,
    },
    itens: extras.itens || ordem.items || [],
    subtotal: extras.subtotal ?? null,
    frete: extras.frete ?? null,
    bruto: extras.incluirBruto ? ordem : undefined,
  };
}

/**
 * Gera um pedido SIMULADO (nenhuma chamada ao Mercado Pago).
 * O id comeca com "SIM-" e carrega o cenario no final (APRO/PEND/REJE),
 * o que permite testar as telas de confirmacao sem credenciais.
 *
 * @param {object} params
 * @param {object} params.dados    Dados validados do checkout (itens, total, etc.)
 * @param {string} [params.cenario] 'APRO' | 'PEND' | 'REJE'
 */
export function simularPedido({ dados, cenario = 'APRO' }) {
  const agora = new Date();
  const carimbo = agora.getTime();
  const id = `SIM-${carimbo}-${cenario}`;

  const cenarioInfo = {
    APRO: { status: 'approved', detalhe: 'accredited' },
    PEND: { status: 'pending', detalhe: 'pending_waiting_payment' },
    REJE: { status: 'rejected', detalhe: 'cc_rejected_other_reason' },
  }[cenario] || { status: 'approved', detalhe: 'accredited' };

  const isPix = ['pix', 'bank_transfer'].includes(String(dados.pagamento?.metodo || '').toLowerCase());
  const isBoleto = ['ticket', 'boleto'].includes(String(dados.pagamento?.metodo || '').toLowerCase());

  const ordemSimulada = {
    id,
    status: 'processed',
    status_detail: 'processed',
    external_reference: dados.referencia,
    total_amount: paraValorMP(dados.total),
    total_paid_amount: cenarioInfo.status === 'approved' ? paraValorMP(dados.total) : '0.00',
    currency: 'BRL',
    created_date: agora.toISOString(),
    last_updated_date: agora.toISOString(),
    payer: { email: dados.cliente?.email },
    transactions: {
      payments: [
        {
          id: `PAY-${carimbo}`,
          status: cenarioInfo.status,
          status_detail: cenarioInfo.detalhe,
          amount: paraValorMP(dados.total),
          paid_amount: cenarioInfo.status === 'approved' ? paraValorMP(dados.total) : '0.00',
          payment_method: {
            id: dados.pagamento?.payment_method_id || (isPix ? 'pix' : isBoleto ? 'bolbradesco' : 'visa'),
            type: dados.pagamento?.metodo || 'credit_card',
            installments: dados.pagamento?.installments || 1,
            installment_amount: dados.pagamento?.installments
              ? paraValorMP(dados.total / dados.pagamento.installments)
              : undefined,
            qr_code: isPix ? '00020126SIMULADO-NAO-PAGUE-ESTE-PIX5204000053039865802BR6009SAO-PAULO' : undefined,
            qr_code_base64: null,
            ticket_url: isBoleto ? 'https://www.mercadopago.com.br/simulado/boleto' : undefined,
            digitable_line: isBoleto ? '34191.09008 61713.957022 71424.640006 6 00000000000000' : undefined,
          },
        },
      ],
    },
  };

  return normalizarPedido(ordemSimulada, {
    simulado: true,
    itens: dados.itens,
    subtotal: dados.subtotal,
    frete: dados.frete,
  });
}

/** Reconstroi um pedido simulado a partir do id salvo no navegador. */
export function reconsultarSimulado(id, extras = {}) {
  const cenario = String(id).split('-').pop() || 'APRO';
  return simularPedido({
    cenario,
    dados: {
      referencia: id,
      total: Number(extras.total || 0),
      subtotal: Number(extras.subtotal || 0),
      itens: extras.itens || [],
      frete: extras.frete || null,
      cliente: extras.cliente || {},
      pagamento: extras.pagamento || {},
    },
  });
}

/** Arredondamento compartilhado (reexport para conveniencia). */
export { arredondar, paraValorMP };
