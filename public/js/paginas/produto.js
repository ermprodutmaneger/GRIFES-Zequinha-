/**
 * Pagina de produto: ficha completa, escolha de tamanho/quantidade e
 * adicao ao carrinho (com aviso de sucesso).
 */

import { carregarProduto, carregarProdutos } from '../api.js';
import { adicionarItem } from '../carrinho.js';
import { brl, esc, parcelas } from '../formato.js';
import { avisar, carregando, estadoVazio, iniciarLayout } from '../layout.js';
import { cardProduto } from '../componentes/card.js';

const container = document.getElementById('produto');
const relacionados = document.getElementById('relacionados');

let produtoAtual = null;
let tamanhoSelecionado = null;
let quantidade = 1;

function renderizarProduto(produto) {
  const desconto = produto.preco_de ? Math.round((1 - produto.preco / produto.preco_de) * 100) : 0;

  container.innerHTML = `
    <nav class="migalhas" aria-label="Voce esta em">
      <a href="/">Inicio</a> /
      <a href="/catálogo.html?categoria=${encodeURIComponent(produto.categoria)}">${esc(produto.categoria)}</a> /
      <span>${esc(produto.nome)}</span>
    </nav>

    <div class="produto">
      <div class="produto__midia">
        <img src="${esc(produto.imagem)}" alt="${esc(produto.nome)}" width="900" height="900">
      </div>

      <div class="produto__info">
        <span class="eyebrow">${esc(produto.categoria)} · ${esc(produto.colecao)}</span>
        <h1>${esc(produto.nome)}</h1>
        <p>${esc(produto.descricao)}</p>

        <div class="produto__preco-bloco">
          ${produto.preco_de ? `<span class="preco--de">${brl(produto.preco_de)}</span>` : ''}
          <span class="produto__preco">${brl(produto.preco)}</span>
          ${desconto > 0 ? `<span class="selo selo--desconto">-${desconto}%</span>` : ''}
        </div>
        <p class="produto__parcelas">
          ${parcelas(produto.preco, 3)} · ou ${brl(produto.preco / 12)} em 12x com juros (simulado)
        </p>

        <div class="opcoes-grupo">
          <span class="opcoes-grupo__rotulo">Tamanho</span>
          <div class="opcoes" id="opcoes-tamanho" role="group" aria-label="Escolha o tamanho">
            ${produto.tamanhos
              .map(
                (tamanho) => `
                <button type="button" class="opcao" data-tamanho="${esc(tamanho)}" aria-pressed="false">${esc(tamanho)}</button>`,
              )
              .join('')}
          </div>
          <p class="campo__erro" id="erro-tamanho"></p>
        </div>

        <div class="opcoes-grupo">
          <span class="opcoes-grupo__rotulo">Quantidade</span>
          <div class="quantidade">
            <button type="button" data-menos aria-label="Diminuir quantidade">−</button>
            <input id="quantidade" type="text" inputmode="numeric" value="1" aria-label="Quantidade" readonly>
            <button type="button" data-mais aria-label="Aumentar quantidade">+</button>
          </div>
        </div>

        <div class="produto__acoes">
          <button class="botao botao--primario" id="botao-adicionar" type="button">
            Adicionar ao carrinho
          </button>
          <a class="botao botao--contorno" href="/carrinho.html">Ir para o carrinho</a>
        </div>

        <div class="aviso aviso--teste">
          <div>
            <strong>Precos e produtos fictícios (loja de teste)</strong>
            Os pagamentos são processados com credenciais de teste do Mercado Pago — nenhuma cobranca real e feita.
          </div>
        </div>

        <div class="ficha">
          <dl>
            <dt>Codigo (SKU)</dt><dd>${esc(produto.id)}</dd>
            <dt>Composicao</dt><dd>${esc(produto.composicao)}</dd>
            <dt>Cores disponiveis</dt><dd>${produto.cores.map((c) => esc(c)).join(', ')}</dd>
            <dt>Tamanhos</dt><dd>${produto.tamanhos.map((t) => esc(t)).join(' · ')}</dd>
            <dt>Peso aproximado</dt><dd>${esc(produto.peso_kg)} kg</dd>
            <dt>Disponibilidade</dt><dd>${produto.estoque} unidades em estoque (fictício)</dd>
          </dl>
        </div>

        <div class="ficha">
          <h3>Cuidados com a peca</h3>
          <ul class="lista-cuidados">
            <li>Lavagem a mao ou ciclo delicado com agua fria.</li>
            <li>Não usar alvejante e não secar em maquina.</li>
            <li>Passar em temperatura baixa, preferencialmente com pano de protecao.</li>
            <li>Frete simulado: econômico, expresso ou retirada no atelier.</li>
          </ul>
        </div>
      </div>
    </div>`;

  /* --------------------------- interacoes --------------------------- */
  const botoesTamanho = container.querySelectorAll('[data-tamanho]');
  botoesTamanho.forEach((botao) => {
    botao.addEventListener('click', () => {
      botoesTamanho.forEach((outro) => outro.setAttribute('aria-pressed', 'false'));
      botao.setAttribute('aria-pressed', 'true');
      tamanhoSelecionado = botao.dataset.tamanho;
      container.querySelector('#erro-tamanho').textContent = '';
    });
  });

  const campoTamanho = container.querySelector('#erro-tamanho');
  const inputQuantidade = container.querySelector('#quantidade');
  container.querySelector('[data-mais]').addEventListener('click', () => {
    quantidade = Math.min(10, quantidade + 1);
    inputQuantidade.value = String(quantidade);
  });
  container.querySelector('[data-menos]').addEventListener('click', () => {
    quantidade = Math.max(1, quantidade - 1);
    inputQuantidade.value = String(quantidade);
  });

  container.querySelector('#botao-adicionar').addEventListener('click', () => {
    if (!tamanhoSelecionado) {
      campoTamanho.textContent = 'Escolha um tamanho antes de continuar.';
      container.querySelector('#opcoes-tamanho').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    adicionarItem({ id: produto.id, tamanho: tamanhoSelecionado, quantidade });
    avisar(`${produto.nome} (Tam. ${tamanhoSelecionado}) adicionado ao carrinho.`, 'sucesso');
  });

  // Pre-seleciona tamanho unico automaticamente.
  if (produto.tamanhos.length === 1) {
    botoesTamanho[0].click();
  }
}

function renderizarRelacionados(lista) {
  if (!relacionados) return;
  if (!lista.length) {
    relacionados.closest('.secao')?.remove();
    return;
  }
  relacionados.innerHTML = lista.map(cardProduto).join('');
}

async function iniciar() {
  await iniciarLayout({ pagina: 'produto.html' });
  carregando(container, 'Carregando produto...');

  const parametros = new URLSearchParams(window.location.search);
  const slug = parametros.get('slug');

  if (!slug) {
    estadoVazio(container, {
      titulo: 'Produto não informado',
      texto: 'Escolha uma peca no catálogo para ver os detalhes.',
      acao: { href: '/catalogo.html', rotulo: 'Ver catálogo' },
    });
    return;
  }

  try {
    produtoAtual = await carregarProduto(slug);
    if (!produtoAtual) throw new Error('Produto não encontrado.');

    document.title = `${produtoAtual.nome} — GRIFES Zequinha`;
    renderizarProduto(produtoAtual);

    const todos = await carregarProdutos();
    renderizarRelacionados(
      todos.filter((p) => p.id !== produtoAtual.id && p.categoria === produtoAtual.categoria).slice(0, 4),
    );
  } catch (e) {
    estadoVazio(container, {
      titulo: 'Produto indisponível',
      texto: e?.message || 'Não foi possível carregar está peca.',
      acao: { href: '/catalogo.html', rotulo: 'Voltar ao catálogo' },
    });
  }
}

iniciar();
