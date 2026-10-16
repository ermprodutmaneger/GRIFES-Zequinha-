/**
 * Checkout Transparente — Payment Brick + Orders API
 * ---------------------------------------------------------------------------
 * Fluxo:
 *   1. Valida os dados do comprador/entrega no navegador (o servidor valida de novo).
 *   2. Calcula o frete SIMULADO em /api/frete (o valor entra no total).
 *   3. Monta o Payment Brick com o total recalculado pelo servidor.
 *   4. No onSubmit o Brick devolve o TOKEN do cartao (formData). Esse token +
 *      os dados do pedido vao para /api/orders, que chama a Orders API com o
 *      ACCESS_TOKEN (que nunca passa pelo navegador).
 *   5. Aprovado ou pendente -> redireciona para /confirmacao.html?id=...
 *      Recusado -> mantem o formulario e mostra o motivo.
 */

import { calcularFrete, carregarConfig, carregarProdutos, criarPedido } from '../api.js';
import {
  detalharItens,
  itensParaApi,
  lerCarrinho,
  limparCarrinho,
  salvarUltimoPedido,
  definirFrete,
} from '../carrinho.js';
import {
  aplicarMascara,
  brl,
  cpfValido,
  emailValido,
  esc,
  mascaraCep,
  mascaraCpf,
  mascaraTelefone,
  parcelas,
  somenteDigitos,
  valorDe,
} from '../formato.js';
import { avisar, blocoAviso, carregando, estadoVazio, iniciarLayout } from '../layout.js';

const CHAVE_COMPRADOR = 'gz_comprador_v1';

const containerResumo = document.getElementById('resumo-checkout');
const containerItens = document.getElementById('itens-checkout');
const containerFrete = document.getElementById('opcoes-frete');
const secaoPagamento = document.getElementById('secao-pagamento');
const containerBrick = document.getElementById('container-brick');
const containerErroPedido = document.getElementById('erro-pedido');
const botaoContinuar = document.getElementById('continuar-pagamento');
const avisoGeral = document.getElementById('aviso-checkout');

let config = null;
let produtos = [];
let calculoAtual = null;
let freteId = lerCarrinho().frete_id || 'economico';
let brickController = null;
let brickMontado = false;
let sdkCarregado = null;

/* ------------------------------------------------------------------ utils */

const numero = (id) => {
  const elemento = document.getElementById(id);
  return elemento ? Number(elemento.value) : NaN;
};

function freteSelecionado() {
  if (!calculoAtual?.opcoes?.length) return null;
  return calculoAtual.opcoes.find((o) => o.id === freteId) || calculoAtual.opcoes[0];
}

function totais() {
  const { itens, subtotal } = detalharItens(produtos);
  const frete = freteSelecionado();
  const total = Math.round((subtotal + (frete?.valor || 0)) * 100) / 100;
  return { itens, subtotal, frete, total };
}

function dadosComprador() {
  return {
    nome: valorDe('nome'),
    email: valorDe('email'),
    cpf: valorDe('cpf'),
    telefone: valorDe('telefone'),
  };
}

function dadosEntrega() {
  return {
    cep: valorDe('cep'),
    rua: valorDe('rua'),
    numero: valorDe('numero'),
    complemento: valorDe('complemento'),
    bairro: valorDe('bairro'),
    cidade: valorDe('cidade'),
    uf: valorDe('uf').toUpperCase(),
  };
}

function persistirComprador() {
  try {
    localStorage.setItem(
      CHAVE_COMPRADOR,
      JSON.stringify({ ...dadosComprador(), ...dadosEntrega(), salvo_em: new Date().toISOString() }),
    );
  } catch {
    /* ignora */
  }
}

function restaurarComprador() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_COMPRADOR) || 'null');
    if (!salvo) return;
    const preencher = (id, valor) => {
      const elemento = document.getElementById(id);
      if (elemento && valor && !elemento.value) elemento.value = valor;
    };
    preencher('nome', salvo.nome);
    preencher('email', salvo.email);
    preencher('cpf', salvo.cpf);
    preencher('telefone', salvo.telefone);
    preencher('cep', salvo.cep);
    preencher('rua', salvo.rua);
    preencher('numero', salvo.numero);
    preencher('complemento', salvo.complemento);
    preencher('bairro', salvo.bairro);
    preencher('cidade', salvo.cidade);
    preencher('uf', salvo.uf);
  } catch {
    /* ignora */
  }
}

/* ------------------------------------------------------------- renderizacao */

function renderizarItens() {
  const { itens } = totais();
  if (!containerItens) return;

  containerItens.innerHTML = itens
    .map(
      (item) => `
      <div class="linha-item" style="grid-template-columns:64px 1fr auto">
        <div class="linha-item__imagem">
          <img src="${esc(item.imagem)}" alt="${esc(item.nome)}" width="128" height="128" loading="lazy">
        </div>
        <div>
          <h3 class="linha-item__nome">${esc(item.nome)}</h3>
          <p class="linha-item__meta">Tam. ${esc(item.tamanho)} · ${item.quantidade} × ${brl(item.preco_unitario)}</p>
        </div>
        <div class="linha-item__preco">${brl(item.subtotal)}</div>
      </div>`,
    )
    .join('');
}

function renderizarResumo() {
  const { itens, subtotal, frete, total } = totais();
  if (!containerResumo) return;

  containerResumo.innerHTML = `
    <div class="painel__titulo"><h2>Resumo</h2></div>
    <ul class="resumo-lista-itens">
      ${itens
        .map(
          (item) => `
        <li><span>${item.quantidade}× ${esc(item.nome)}</span><span>${brl(item.subtotal)}</span></li>`,
        )
        .join('')}
    </ul>
    <div class="resumo-linhas">
      <div class="resumo-linha"><span>Subtotal</span><span>${brl(subtotal)}</span></div>
      <div class="resumo-linha">
        <span>Frete ${frete ? `(${esc(frete.nome)})` : ''}</span>
        <span>${frete ? (frete.gratis ? 'Grátis' : brl(frete.valor)) : 'A calcular'}</span>
      </div>
      ${frete ? `<div class="resumo-linha"><span>Prazo</span><span>${esc(frete.prazo_texto)}</span></div>` : ''}
      <div class="resumo-linha resumo-linha--destaque"><span>Total</span><span>${brl(total)}</span></div>
      <div class="resumo-linha" style="font-size:.82rem;color:var(--tinta-3)">
        <span>No cartão</span><span>${parcelas(total, 3)}</span>
      </div>
    </div>
    <div class="aviso aviso--teste" style="margin-bottom:0">
      <div>
        <strong>Modo de teste do Mercado Pago</strong>
        O valor acima e o que será enviado em <code>total_amount</code> para a Orders API.
        ${
          config?.simulacao
            ? ' Sem credenciais configuradas, o pedido e apenas simulado.'
            : ' Nenhuma cobranca real e feita com credenciais de teste.'
        }
      </div>
    </div>`;

  // Atualiza o total exibido no botao de continuar.
  const rotuloTotal = document.getElementById('total-botao');
  if (rotuloTotal) rotuloTotal.textContent = brl(total);
}

function renderizarOpcoesFrete() {
  if (!containerFrete) return;

  if (!calculoAtual) {
    containerFrete.innerHTML = `
      <p class="preciso-de-cep">Informe o CEP e clique em <strong>Calcular</strong> para ver as opções de frete simulado.</p>`;
    return;
  }

  containerFrete.innerHTML = calculoAtual.opcoes
    .map(
      (opcao) => `
      <label class="opcao-frete">
        <input type="radio" name="frete" value="${esc(opcao.id)}" ${opcao.id === freteId ? 'checked' : ''}>
        <span>
          <span class="opcao-frete__nome">${esc(opcao.nome)}</span>
          <span class="opcao-frete__meta">${esc(opcao.transportadora)} · ${esc(opcao.prazo_texto)}</span>
        </span>
        <span class="opção-frete__valor ${opcao.gratis ? 'opcao-frete__valor--gratis' : ''}">
          ${opcao.gratis ? 'Grátis' : brl(opcao.valor)}
        </span>
      </label>`,
    )
    .join('');

  containerFrete.querySelectorAll('input[name="frete"]').forEach((radio) => {
    radio.addEventListener('change', async () => {
      freteId = radio.value;
      definirFrete({ frete_id: freteId, cep: calculoAtual.cep });
      renderizarResumo();
      // O valor do Brick precisa acompanhar o novo total.
      if (brickMontado) {
        await montarBrick({ recriar: true });
      }
    });
  });
}

/* -------------------------------------------------------------- frete (CEP) */

async function calcularFreteDoCheckout({ silencioso = false } = {}) {
  const cep = valorDe('cep');
  const itens = itensParaApi();
  const aviso = document.getElementById('aviso-frete-checkout');

  if (somenteDigitos(cep).length !== 8) {
    if (!silencioso) blocoAviso(aviso, { tipo: 'erro', texto: 'Informe um CEP com 8 dígitos (ex.: 01310-100).' });
    return false;
  }
  if (!itens.length) {
    blocoAviso(aviso, { tipo: 'erro', texto: 'Carrinho vazio.' });
    return false;
  }

  const botao = document.getElementById('calcular-frete-checkout');
  if (botao) {
    botao.disabled = true;
    botao.textContent = 'Calculando...';
  }

  try {
    calculoAtual = await calcularFrete({ cep, itens });
    freteId = calculoAtual.opcoes.some((o) => o.id === freteId) ? freteId : 'economico';
    definirFrete({ frete_id: freteId, cep: calculoAtual.cep });
    blocoAviso(aviso, {
      tipo: 'teste',
      titulo: 'Frete simulado',
      html: `${esc(calculoAtual.aviso)}<br>${esc(calculoAtual.cep)} — ${esc(calculoAtual.regiao)} · ${esc(
        calculoAtual.peso_kg,
      )} kg estimados.`,
    });
    renderizarOpcoesFrete();
    renderizarResumo();
    persistirComprador();
    return true;
  } catch (e) {
    calculoAtual = null;
    blocoAviso(aviso, { tipo: 'erro', titulo: 'Frete não calculado', texto: e?.message || 'Revise o CEP.' });
    renderizarOpcoesFrete();
    return false;
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = 'Calcular';
    }
  }
}

/* ---------------------------------------------------------------- validacao */

function marcarErro(id, mensagem) {
  const campo = document.getElementById(id);
  const alvo = document.getElementById(`erro-${id}`);
  if (campo) campo.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
  if (alvo) alvo.textContent = mensagem || '';
  return Boolean(mensagem);
}

function validarFormulario() {
  const comprador = dadosComprador();
  const entrega = dadosEntrega();
  let primeiroErro = null;

  const problemas = [
    ['nome', comprador.nome.split(/\s+/).filter(Boolean).length < 2 ? 'Informe nome e sobrenome.' : ''],
    ['email', !emailValido(comprador.email) ? 'Informe um e-mail válido.' : ''],
    ['cpf', !cpfValido(comprador.cpf) ? 'CPF inválido (confira os dígitos).' : ''],
    [
      'telefone',
      somenteDigitos(comprador.telefone).length < 10 ? 'Informe DDD + telefone.' : '',
    ],
    ['cep', somenteDigitos(entrega.cep).length !== 8 ? 'Informe um CEP com 8 dígitos.' : ''],
    ['rua', !entrega.rua ? 'Informe a rua.' : ''],
    ['numero', !entrega.numero ? 'Informe o número.' : ''],
    ['bairro', !entrega.bairro ? 'Informe o bairro.' : ''],
    ['cidade', !entrega.cidade ? 'Informe a cidade.' : ''],
    ['uf', !/^[A-Z]{2}$/.test(entrega.uf) ? 'Use a sigla do estado (ex.: SP).' : ''],
  ];

  problemas.forEach(([id, mensagem]) => {
    if (marcarErro(id, mensagem) && !primeiroErro) primeiroErro = id;
  });

  if (!calculoAtual) {
    blocoAviso(document.getElementById('aviso-frete-checkout'), {
      tipo: 'atencao',
      titulo: 'Calcule o frete',
      texto: 'Clique em "Calcular" ao lado do CEP para obter o frete simulado antes de pagar.',
    });
    if (!primeiroErro) primeiroErro = 'cep';
  }

  if (primeiroErro) {
    avisar('Confira os campos destacados antes de continuar.', 'erro');
    document.getElementById(primeiroErro)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    document.getElementById(primeiroErro)?.focus({ preventScroll: true });
    return false;
  }

  persistirComprador();
  return true;
}

/* ------------------------------------------------------------- SDK + Brick */

function carregarSdkMP() {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (sdkCarregado) return sdkCarregado;

  sdkCarregado = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      if (window.MercadoPago) resolve(window.MercadoPago);
      else reject(new Error('SDK do Mercado Pago carregou sem a API esperada.'));
    };
    script.onerror = () =>
      reject(
        new Error(
          'Não foi possível carregar o SDK do Mercado Pago (sdk.mercadopago.com). Verifique a conexão ou a Content-Security-Policy.',
        ),
      );
    document.head.appendChild(script);
  });

  return sdkCarregado;
}

async function montarBrick({ recriar = false } = {}) {
  if (!containerBrick) return;
  const { total, frete } = totais();

  // 1) Sem credenciais -> painel de simulacao (nada sai para o Mercado Pago).
  if (!config?.public_key || !config?.access_token_configurado) {
    renderizarSimulacao({ total, frete });
    return;
  }

  // 2) Credenciais OK -> Brick de verdade.
  try {
    containerBrick.innerHTML = `
      <div class="brick-container__carregando"><span class="girando" aria-hidden="true"></span>
      <span>Carregando as formas de pagamento do Mercado Pago...</span></div>`;

    const MercadoPago = await carregarSdkMP();

    if (brickController && recriar) {
      try {
        await brickController.unmount();
      } catch {
        /* ignora */
      }
      brickController = null;
      containerBrick.innerHTML = '';
    }

    const comprador = dadosComprador();
    const [primeiroNome, ...resto] = comprador.nome.split(/\s+/);

    const mp = new MercadoPago(config.public_key, { locale: 'pt-BR' });
    const bricksBuilder = mp.bricks();

    brickController = await bricksBuilder.create('payment', 'container-brick', {
      initialization: {
        // O total inclui o frete simulado e e recalculado NO SERVIDOR antes
        // de virar `total_amount` na Orders API.
        amount: Number(total.toFixed(2)),
        payer: {
          email: comprador.email || undefined,
          firstName: primeiroNome || undefined,
          lastName: resto.join(' ') || undefined,
          identification:
            somenteDigitos(comprador.cpf).length === 11
              ? { type: 'CPF', number: somenteDigitos(comprador.cpf) }
              : undefined,
        },
      },
      customization: {
        paymentMethods: {
          creditCard: 'all',
          debitCard: 'all',
          ticket: 'all',
          bankTransfer: 'all',
          minInstallments: 1,
          maxInstallments: 12,
        },
        visual: { style: { theme: 'default' } },
      },
      callbacks: {
        onReady: () => {
          brickMontado = true;
          document.querySelectorAll('[data-brick-carregando]').forEach((el) => el.remove());
        },
        onSubmit: async ({ selectedPaymentMethod, formData }, additionalData) => {
          return enviarPagamento({ selectedPaymentMethod, formData, additionalData });
        },
        onError: (erroBrick) => {
          console.error('[brick] erro', erroBrick);
          const mensagem =
            erroBrick?.cause === 'missing_amount_property'
              ? 'Valor do pagamento ausente: calcule o frete novamente.'
              : erroBrick?.message || 'Erro no formulário de pagamento do Mercado Pago.';
          blocoAviso(containerErroPedido, { tipo: 'erro', titulo: 'Formulário de pagamento', texto: mensagem });
        },
      },
      locale: 'pt-BR',
    });

    brickMontado = true;
    return brickController;
  } catch (e) {
    containerBrick.innerHTML = '';
    blocoAviso(containerErroPedido, {
      tipo: 'erro',
      titulo: 'Não foi possível carregar o Payment Brick',
      html: `${esc(e?.message || 'Erro desconhecido.')}<br><br>
        Confira se a <strong>MP_PUBLIC_KEY</strong> configurada e valida em
        <a href="/diagnostico.html">/diagnostico.html</a>.`,
    });
  }
}

/** Painel usado quando ainda nao ha credenciais configuradas. */
function renderizarSimulacao({ total, frete }) {
  const cenario = document.getElementById('cenario-simulado')?.value || 'APRO';
  containerBrick.innerHTML = `
    <div class="aviso aviso--teste">
      <div>
        <strong>Credenciais não configuradas — pagamento SIMULADO</strong>
        Nenhuma chamada e enviada ao Mercado Pago. Cole as credenciais de teste em
        <code>.dev.vars</code> (local) ou em <em>Settings &gt; Variables and Secrets</em> (Cloudflare Pages)
        e recarregue está página para usar o Payment Brick de verdade.
        <a class="link-simples" href="/diagnostico.html">Ver checklist de configuração →</a>
      </div>
    </div>

    <div class="grade-campos" style="margin:1rem 0">
      <div class="campo">
        <label for="cenario-simulado">Resultado simulado</label>
        <select id="cenario-simulado">
          <option value="APRO" ${cenario === 'APRO' ? 'selected' : ''}>Aprovado</option>
          <option value="PEND" ${cenario === 'PEND' ? 'selected' : ''}>Pendente (Pix / boleto)</option>
          <option value="REJE" ${cenario === 'REJE' ? 'selected' : ''}>Recusado</option>
        </select>
      </div>
      <div class="campo">
        <label for="metodo-simulado">Meio de pagamento simulado</label>
        <select id="metodo-simulado">
          <option value="credit_card">Cartão de crédito</option>
          <option value="bank_transfer">Pix</option>
          <option value="ticket">Boleto</option>
        </select>
      </div>
    </div>

    <button class="botao botao--ouro botao--largo" type="button" id="simular-pagamento">
      Simular pagamento de ${brl(total)} ${frete ? `(frete ${frete.gratis ? 'gratis' : brl(frete.valor)})` : ''}
    </button>`;

  containerBrick.querySelector('#simular-pagamento')?.addEventListener('click', async () => {
    const botao = containerBrick.querySelector('#simular-pagamento');
    const metodo = containerBrick.querySelector('#metodo-simulado')?.value || 'credit_card';
    botao.disabled = true;
    botao.textContent = 'Processando simulação...';
    try {
      await enviarPagamento({
        selectedPaymentMethod: metodo,
        formData: { transaction_amount: total, installments: 1, payment_method_id: 'visa' },
        additionalData: {},
        cenario: containerBrick.querySelector('#cenario-simulado')?.value || 'APRO',
      });
    } catch (e) {
      botao.disabled = false;
      botao.textContent = `Simular pagamento de ${brl(total)}`;
      mostrarErroPedido(e);
    }
  });
}

/* ------------------------------------------------------------- envio do pedido */

async function enviarPagamento({ selectedPaymentMethod, formData, additionalData, cenario = null }) {
  const comprador = dadosComprador();
  const entrega = dadosEntrega();
  const { total, subtotal, frete, itens } = totais();

  blocoAviso(containerErroPedido, { tipo: 'info', texto: 'Enviando o pedido para o Mercado Pago...' });

  const corpo = {
    itens: itensParaApi(),
    frete_id: freteId,
    cliente: comprador,
    entrega,
    pagamento: {
      metodo: selectedPaymentMethod,
      payment_type_id: additionalData?.paymentTypeId || selectedPaymentMethod,
      payment_method_id: formData?.payment_method_id,
      token: formData?.token,
      installments: formData?.installments,
      issuer_id: formData?.issuer_id,
      financial_institution: formData?.transaction_details?.financial_institution,
      transaction_amount: formData?.transaction_amount,
      payer: formData?.payer,
    },
    observacoes: valorDe('observacoes'),
    cenario_simulado: cenario || document.getElementById('cenario-simulado')?.value || undefined,
  };

  // Conferencia amigavel: o total do Brick deve ser igual ao do servidor.
  if (formData?.transaction_amount && Math.abs(Number(formData.transaction_amount) - total) > 0.01) {
    console.warn('[checkout] divergencia de valor', { brick: formData.transaction_amount, servidor: total });
  }

  const resposta = await criarPedido(corpo);
  const pedido = resposta.pedido;

  salvarUltimoPedido({
    ...pedido,
    itens,
    subtotal,
    frete,
    total,
    comprador,
    entrega,
    observacoes: corpo.observacoes,
  });

  limparCarrinho();

  const parametros = new URLSearchParams({ id: pedido.id });
  if (resposta.simulado) parametros.set('simulado', '1');
  window.location.assign(`/confirmacao.html?${parametros.toString()}`);

  // Pedido aprovado/pendente: a confirmacao assume a tela.
  return 'approved' === pedido.status ? 'approved' : pedido.status === 'rejected' ? 'rejected' : 'pending';
}

function mostrarErroPedido(e) {
  const detalhes =
    e?.detalhes?.cause?.map((c) => c?.description || c?.code).filter(Boolean).join(' · ') ||
    e?.detalhes?.message ||
    '';

  const credencialInvalida = e?.codigo === 'credencial_invalida';

  blocoAviso(containerErroPedido, {
    tipo: 'erro',
    titulo: credencialInvalida ? 'Credenciais do Mercado Pago recusadas' : 'Não foi possível concluir o pagamento',
    html: `
      ${esc(e?.message || 'Erro inesperado.')}
      ${detalhes ? `<br><br><small><strong>Detalhe técnico:</strong> ${esc(detalhes)}</small>` : ''}
      ${
        credencialInvalida
          ? '<br><br><a class="link-simples" href="/diagnostico.html">Abrir diagnostico das credenciais →</a>'
          : ''
      }`,
  });

  document.getElementById('erro-pedido')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  avisar('Pagamento não concluido. Confira a mensagem na tela.', 'erro');
}

/* -------------------------------------------------------------------- inicio */

async function iniciar() {
  config = await iniciarLayout({ pagina: 'checkout.html' });
  carregando(containerResumo, 'Carregando...');

  try {
    produtos = await carregarProdutos();
  } catch (e) {
    estadoVazio(containerResumo, { titulo: 'Catálogo indisponível', texto: e?.message || 'Recarregue a página.' });
    return;
  }

  const detalhes = detalharItens(produtos);
  if (!detalhes.itens.length) {
    estadoVazio(document.getElementById('conteudo-checkout'), {
      titulo: 'Seu carrinho está vazio',
      texto: 'Adicione pecas ao carrinho para testar o pagamento.',
      acao: { href: '/catalogo.html', rotulo: 'Ver produtos' },
    });
    return;
  }

  // Aviso do modo de operacao (teste / simulacao).
  blocoAviso(avisoGeral, {
    tipo: 'teste',
    titulo: config?.simulacao ? 'Loja em MODO SIMULACAO' : 'Loja em MODO DE TESTE',
    html: config?.simulacao
      ? 'Sem credenciais configuradas o pedido e apenas simulado. <a class="link-simples" href="/diagnostico.html">Configurar credenciais →</a>'
      : 'Os pagamentos usam as credenciais de TESTE do Mercado Pago. Use os cartões de teste para aprovar ou recusar. <a class="link-simples" href="/diagnostico.html">Ver diagnostico →</a>',
  });

  restaurarComprador();

  // Mascaras.
  aplicarMascara(document.getElementById('cep'), mascaraCep);
  aplicarMascara(document.getElementById('cpf'), mascaraCpf);
  aplicarMascara(document.getElementById('telefone'), mascaraTelefone);
  ['nome', 'email', 'cpf', 'telefone', 'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].forEach((id) => {
    document.getElementById(id)?.addEventListener('blur', persistirComprador);
  });

  // CEP: calcula ao completar 8 digitos.
  const campoCep = document.getElementById('cep');
  campoCep?.addEventListener('input', () => {
    if (somenteDigitos(campoCep.value).length === 8) calcularFreteDoCheckout({ silencioso: true });
  });
  document.getElementById('calcular-frete-checkout')?.addEventListener('click', () => calcularFreteDoCheckout());
  // Enter dentro do formulario nao deve submeter a pagina.
  document.getElementById('form-checkout')?.addEventListener('submit', (evento) => evento.preventDefault());

  renderizarItens();
  renderizarResumo();
  renderizarOpcoesFrete();

  if (somenteDigitos(valorDe('cep')).length === 8) {
    await calcularFreteDoCheckout({ silencioso: true });
  }

  // Passo 3: pagamento.
  botaoContinuar?.addEventListener('click', async () => {
    if (!validarFormulario()) return;
    secaoPagamento.removeAttribute('hidden');
    botaoContinuar.textContent = 'Formulário de pagamento liberado abaixo';
    botaoContinuar.disabled = true;
    document.getElementById('container-brick')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await montarBrick();
  });
}

iniciar();
