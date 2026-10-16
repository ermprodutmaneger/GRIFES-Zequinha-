/**
 * Carrinho: ajuste de quantidades, calculo de frete SIMULADO por CEP e
 * resumo com o total que sera cobrado no Mercado Pago.
 */

import { calcularFrete, carregarProdutos } from '../api.js';
import {
  atualizarQuantidade,
  detalharItens,
  lerCarrinho,
  removerItem,
  definirFrete,
  limparCarrinho,
} from '../carrinho.js';
import { brl, esc, mascaraCep, parcelas } from '../formato.js';
import { avisar, blocoAviso, carregando, estadoVazio, iniciarLayout } from '../layout.js';

const containerItens = document.getElementById('itens-carrinho');
const painelResumo = document.getElementById('resumo-carrinho');
const secaoFrete = document.getElementById('secao-frete');
const campoCep = document.getElementById('cep');
const botaoCalcular = document.getElementById('calcular-frete');
const opcoesFreteContainer = document.getElementById('opcoes-frete');
const avisoFrete = document.getElementById('aviso-frete');

let produtos = [];
let calculoAtual = null; // resposta de /api/frete
let freteSelecionado = lerCarrinho().frete_id || 'economico';

/** Frete escolhido dentro do calculo atual (opcao completa). */
function opcaoSelecionada() {
  if (!calculoAtual?.opcoes?.length) return null;
  return calculoAtual.opcoes.find((o) => o.id === freteSelecionado) || calculoAtual.opcoes[0];
}

function renderizarItens() {
  const { itens, subtotal, quantidade } = detalharItens(produtos);

  if (!itens.length) {
    containerItens.innerHTML = '';
    estadoVazio(containerItens, {
      titulo: 'Seu carrinho está vazio',
      texto: 'Explore o catálogo e adicione pecas para testar o checkout do Mercado Pago.',
      acao: { href: '/catalogo.html', rotulo: 'Ver produtos' },
    });
    secaoFrete?.setAttribute('hidden', 'hidden');
    painelResumo?.setAttribute('hidden', 'hidden');
    return { itens, subtotal, quantidade };
  }

  secaoFrete?.removeAttribute('hidden');
  painelResumo?.removeAttribute('hidden');

  containerItens.innerHTML = itens
    .map(
      (item) => `
      <div class="linha-item" data-item="${esc(item.id)}" data-tamanho="${esc(item.tamanho)}">
        <div class="linha-item__imagem">
          <img src="${esc(item.imagem)}" alt="${esc(item.nome)}" width="168" height="168" loading="lazy">
        </div>
        <div>
          <h3 class="linha-item__nome">
            <a href="/produto.html?slug=${encodeURIComponent(item.slug)}">${esc(item.nome)}</a>
          </h3>
          <p class="linha-item__meta">SKU ${esc(item.id)} · Tamanho ${esc(item.tamanho)} · ${esc(item.categoria)}</p>
          <div class="linha-item__acoes">
            <div class="quantidade">
              <button type="button" data-ação="menos" aria-label="Diminuir quantidade de ${esc(item.nome)}">−</button>
              <input type="text" inputmode="numeric" value="${item.quantidade}" aria-label="Quantidade" readonly>
              <button type="button" data-ação="mais" aria-label="Aumentar quantidade de ${esc(item.nome)}">+</button>
            </div>
            <button class="link-simples" type="button" data-ação="remover">Remover</button>
          </div>
        </div>
        <div class="linha-item__preco">
          ${brl(item.subtotal)}
          ${item.quantidade > 1 ? `<small>${item.quantidade} × ${brl(item.preco_unitario)}</small>` : ''}
        </div>
      </div>`,
    )
    .join('');

  containerItens.querySelectorAll('[data-item]').forEach((linha) => {
    const id = linha.dataset.item;
    const tamanho = linha.dataset.tamanho;
    const quantidadeAtual = Number(linha.querySelector('input').value) || 1;

    linha.querySelector('[data-ação="menos"]').addEventListener('click', () => {
      atualizarQuantidade({ id, tamanho, quantidade: quantidadeAtual - 1 });
      atualizarTudo();
    });
    linha.querySelector('[data-ação="mais"]').addEventListener('click', () => {
      atualizarQuantidade({ id, tamanho, quantidade: quantidadeAtual + 1 });
      atualizarTudo();
    });
    linha.querySelector('[data-ação="remover"]').addEventListener('click', () => {
      removerItem({ id, tamanho });
      avisar('Item removido do carrinho.', 'info');
      atualizarTudo();
    });
  });

  return { itens, subtotal, quantidade };
}

function renderizarOpcoesFrete() {
  if (!opcoesFreteContainer) return;

  if (!calculoAtual) {
    opcoesFreteContainer.innerHTML = `
      <p class="preciso-de-cep">Informe o CEP acima para ver as opções de frete simulado (econômico, expresso ou retirada no atelier).</p>`;
    return;
  }

  opcoesFreteContainer.innerHTML = calculoAtual.opcoes
    .map(
      (opcao) => `
      <label class="opcao-frete">
        <input type="radio" name="frete" value="${esc(opcao.id)}" ${
          opcao.id === freteSelecionado ? 'checked' : ''
        }>
        <span>
          <span class="opcao-frete__nome">${esc(opcao.nome)}</span>
          <span class="opcao-frete__meta">
            ${esc(opcao.transportadora)} · ${esc(opcao.prazo_texto)}
            ${
              opcao.id === 'retirada'
                ? ''
                : ` · entrega prevista ${esc(opcao.previsao_entrega.split('-').reverse().join('/'))}`
            }
          </span>
          <span class="opcao-frete__meta">${esc(opcao.observacao)}</span>
        </span>
        <span class="opção-frete__valor ${opcao.gratis ? 'opcao-frete__valor--gratis' : ''}">
          ${opcao.gratis ? 'Grátis' : brl(opcao.valor)}
        </span>
      </label>`,
    )
    .join('');

  opcoesFreteContainer.querySelectorAll('input[name="frete"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      freteSelecionado = radio.value;
      definirFrete({ frete_id: freteSelecionado, cep: calculoAtual.cep });
      renderizarResumo();
    });
  });
}

function renderizarResumo() {
  const { itens, subtotal } = detalharItens(produtos);
  if (!itens.length) return;

  const frete = opcaoSelecionada();
  const total = Math.round((subtotal + (frete?.valor || 0)) * 100) / 100;

  painelResumo.innerHTML = `
    <div class="painel__titulo">
      <h2>Resumo do pedido</h2>
      <button class="link-simples" type="button" id="limpar-carrinho">Esvaziar</button>
    </div>

    <ul class="resumo-lista-itens">
      ${itens
        .map(
          (item) => `
        <li>
          <span>${item.quantidade}× ${esc(item.nome)} <small>(Tam. ${esc(item.tamanho)})</small></span>
          <span>${brl(item.subtotal)}</span>
        </li>`,
        )
        .join('')}
    </ul>

    <div class="resumo-linhas">
      <div class="resumo-linha"><span>Subtotal</span><span>${brl(subtotal)}</span></div>
      <div class="resumo-linha">
        <span>Frete ${frete ? `(${esc(frete.nome)})` : ''}</span>
        <span>${
          frete
            ? frete.gratis
              ? '<span class="resumo-linha--desconto">Grátis</span>'
              : brl(frete.valor)
            : 'A calcular'
        }</span>
      </div>
      ${
        frete
          ? `<div class="resumo-linha"><span>Prazo estimado</span><span>${esc(frete.prazo_texto)}</span></div>`
          : ''
      }
      <div class="resumo-linha resumo-linha--destaque"><span>Total</span><span>${brl(total)}</span></div>
      <div class="resumo-linha" style="font-size:.82rem;color:var(--tinta-3)">
        <span>No cartão</span><span>${parcelas(total, 3)}</span>
      </div>
    </div>

    <a class="botao botao--ouro botao--largo" href="/checkout.html" id="ir-para-checkout">
      Finalizar compra
    </a>
    <p class="preciso-de-cep" style="margin-top:.85rem">
      O frete e fictício (simulado) e entra no valor final enviado ao Mercado Pago.
    </p>
    <a class="link-simples continuar-comprando" href="/catalogo.html">← Continuar comprando</a>`;

  painelResumo.querySelector('#limpar-carrinho')?.addEventListener('click', () => {
    limparCarrinho();
    calculoAtual = null;
    avisar('Carrinho esvaziado.', 'info');
    atualizarTudo();
  });
}

async function calcular() {
  const cep = campoCep?.value || '';
  const itens = detalharItens(produtos).itens.map((i) => ({ id: i.id, quantidade: i.quantidade, tamanho: i.tamanho }));

  if (!itens.length) {
    avisar('Adicione itens antes de calcular o frete.', 'erro');
    return;
  }

  botaoCalcular.disabled = true;
  botaoCalcular.textContent = 'Calculando...';
  blocoAviso(avisoFrete, { tipo: 'info', texto: 'Calculando frete simulado...' });

  try {
    calculoAtual = await calcularFrete({ cep, itens });
    freteSelecionado = calculoAtual.opcoes.some((o) => o.id === freteSelecionado) ? freteSelecionado : 'economico';
    definirFrete({ frete_id: freteSelecionado, cep: calculoAtual.cep });

    blocoAviso(avisoFrete, {
      tipo: 'teste',
      titulo: 'Frete simulado',
      html: `${esc(calculoAtual.aviso)}<br>Destino: ${esc(calculoAtual.cep)} — ${esc(calculoAtual.regiao)} · peso estimado ${esc(
        calculoAtual.peso_kg,
      )} kg.`,
    });
    renderizarOpcoesFrete();
    renderizarResumo();
    avisar('Frete calculado (simulado).', 'sucesso');
  } catch (e) {
    calculoAtual = null;
    blocoAviso(avisoFrete, { tipo: 'erro', titulo: 'Não foi possível calcular', texto: e?.message || 'Revise o CEP informado.' });
    renderizarOpcoesFrete();
  } finally {
    botaoCalcular.disabled = false;
    botaoCalcular.textContent = 'Calcular frete';
  }
}

function atualizarTudo() {
  const { itens } = renderizarItens();
  if (itens.length) {
    renderizarResumo();
    renderizarOpcoesFrete();
  }
}

async function iniciar() {
  await iniciarLayout({ pagina: 'carrinho.html' });
  carregando(containerItens, 'Carregando carrinho...');

  try {
    produtos = await carregarProdutos();
  } catch (e) {
    estadoVazio(containerItens, { titulo: 'Catálogo indisponível', texto: e?.message || 'Recarregue a página.' });
    return;
  }

  if (campoCep) {
    campoCep.value = lerCarrinho().cep || '';
    campoCep.addEventListener('input', () => {
      campoCep.value = mascaraCep(campoCep.value);
    });
    campoCep.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        calcular();
      }
    });
  }

  botaoCalcular?.addEventListener('click', calcular);

  atualizarTudo();

  // Se o CEP ja foi informado antes, recalcula automaticamente.
  if (campoCep?.value.replace(/\D/g, '').length === 8) {
    await calcular();
  } else {
    renderizarOpcoesFrete();
  }
}

iniciar();
