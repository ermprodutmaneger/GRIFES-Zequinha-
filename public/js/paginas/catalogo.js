/**
 * Home + catalogo: renderiza os cards de produto e os filtros por categoria.
 * Usado por index.html (?destaques) e catalogo.html (catalogo completo).
 */

import { carregarProdutos } from '../api.js';
import { brl, esc, parcelas } from '../formato.js';
import { avisar, carregando, estadoVazio, iniciarLayout } from '../layout.js';
import { cardProduto } from '../componentes/card.js';

const container = document.getElementById('grade-produtos');
const filtros = document.getElementById('filtros-categoria');
const campoBusca = document.getElementById('busca-produto');
const ordenacao = document.getElementById('ordenacao');
const avisoContainer = document.getElementById('aviso-catalogo');
const APENAS_DESTAQUES = document.body.dataset.apenasDestaques === 'true';

let produtos = [];

function renderizar(lista) {
  if (!container) return;
  if (!lista.length) {
    estadoVazio(container, {
      titulo: 'Nenhum produto encontrado',
      texto: 'Tente outra busca ou remova os filtros aplicados.',
      acao: { href: '/catalogo.html', rotulo: 'Ver o catálogo completo' },
    });
    return;
  }
  container.innerHTML = lista.map(cardProduto).join('');
}

function aplicarFiltros() {
  const categoria = filtros?.querySelector('input:checked')?.value || 'todas';
  const busca = (campoBusca?.value || '').trim().toLowerCase();
  const ordem = ordenacao?.value || 'destaques';

  let lista = produtos.filter((produto) => {
    const combinaCategoria = categoria === 'todas' || produto.categoria === categoria;
    const combinaBusca =
      !busca ||
      [produto.nome, produto.categoria, produto.colecao, produto.descricao_curta]
        .join(' ')
        .toLowerCase()
        .includes(busca);
    return combinaCategoria && combinaBusca;
  });

  const ordenadores = {
    'menor-preco': (a, b) => a.preco - b.preco,
    'maior-preco': (a, b) => b.preco - a.preco,
    'nome': (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
    destaques: (a, b) => Number(b.destaque) - Number(a.destaque) || Number(b.lancamento) - Number(a.lancamento),
  };

  lista = [...lista].sort(ordenadores[ordem] || ordenadores.destaques);
  renderizar(lista);

  const contador = document.getElementById('contador-resultados');
  if (contador) contador.textContent = `${lista.length} produto(s)`;
}

function montarFiltros(categorias) {
  if (!filtros) return;
  filtros.innerHTML = ['todas', ...categorias]
    .map(
      (categoria, indice) => `
      <label class="opcao" style="display:inline-flex;gap:.45rem;align-items:center">
        <input type="radio" name="categoria" value="${esc(categoria)}" ${indice === 0 ? 'checked' : ''} style="accent-color:currentColor" />
        <span>${categoria === 'todas' ? 'Todas' : esc(categoria)}</span>
      </label>`,
    )
    .join('');
  filtros.addEventListener('change', aplicarFiltros);
}

async function iniciar() {
  const config = await iniciarLayout({ pagina: APENAS_DESTAQUES ? 'index.html' : 'catalogo.html' });
  carregando(container, 'Carregando catálogo...');

  try {
    produtos = await carregarProdutos();
    if (APENAS_DESTAQUES) produtos = produtos.filter((p) => p.destaque);

    const categorias = [...new Set(produtos.map((p) => p.categoria))];
    montarFiltros(categorias);

    if (campoBusca) campoBusca.addEventListener('input', aplicarFiltros);
    if (ordenacao) ordenacao.addEventListener('change', aplicarFiltros);

    renderizar(produtos);
    const contador = document.getElementById('contador-resultados');
    if (contador) contador.textContent = `${produtos.length} produto(s)`;

    if (config?.simulacao && avisoContainer) {
      avisoContainer.innerHTML = `
        <div class="aviso aviso--teste">
          <div>
            <strong>Loja de demonstracao — modo simulação</strong>
            Produtos, precos e imagens são fictícios. Como não ha credenciais configuradas, os pedidos são simulados.
          </div>
        </div>`;
    }
  } catch (e) {
    avisar('Não foi possível carregar o catálogo.', 'erro');
    estadoVazio(container, {
      titulo: 'Catálogo indisponível',
      texto: e?.message || 'Tente recarregar a página.',
    });
  }
}

iniciar();
