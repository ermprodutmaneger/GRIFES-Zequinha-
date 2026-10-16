/**
 * Componente de card de produto (usado no catalogo, na home e em relacionados).
 */

import { brl, esc, parcelas } from '../formato.js';

export function cardProduto(produto) {
  const desconto = produto.preco_de ? Math.round((1 - produto.preco / produto.preco_de) * 100) : 0;
  const selos = [
    produto.lancamento ? '<span class="selo selo--verde">Novo</span>' : '',
    desconto > 0 ? `<span class="selo selo--desconto">-${desconto}%</span>` : '',
    produto.destaque ? '<span class="selo selo--ouro">Destaque</span>' : '',
    produto.estoque <= 6 ? '<span class="selo selo--tinta">Ultimas pecas</span>' : '',
  ]
    .filter(Boolean)
    .join('');

  return `
    <article class="card-produto">
      <a class="card-produto__link" href="/produto.html?slug=${encodeURIComponent(produto.slug)}">
        <div class="card-produto__midia">
          <img src="${esc(produto.imagem)}" alt="${esc(produto.nome)}" loading="lazy" width="900" height="900">
          <div class="card-produto__selos">${selos}</div>
        </div>
        <div class="card-produto__corpo">
          <span class="card-produto__categoria">${esc(produto.categoria)} · ${esc(produto.colecao)}</span>
          <h3 class="card-produto__nome">${esc(produto.nome)}</h3>
          <p class="card-produto__descricao">${esc(produto.descricao_curta)}</p>
          <div class="card-produto__precos">
            ${produto.preco_de ? `<span class="preco--de">${brl(produto.preco_de)}</span>` : ''}
            <span class="preco">${brl(produto.preco)}</span>
            <span class="card-produto__parcelas">${parcelas(produto.preco, 3)}</span>
          </div>
        </div>
      </a>
    </article>`;
}
