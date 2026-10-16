/**
 * Layout compartilhado: faixa de MODO DE TESTE, contador do carrinho,
 * marcacao do link ativo, avisos flutuantes (toast) e rodape.
 */

import { carregarConfig } from './api.js';
import { contarItens } from './carrinho.js';
import { esc } from './formato.js';

/** Inicia o layout da pagina e devolve a configuracao publica da loja. */
export async function iniciarLayout({ pagina = '' } = {}) {
  let config = null;
  try {
    config = await carregarConfig();
  } catch (e) {
    console.warn('[layout] não foi possível carregar /api/config', e);
  }

  aplicarFaixaTeste(config);
  marcarLinkAtivo(pagina);
  sincronizarContadorCarrinho();
  document.addEventListener('carrinho:alterado', sincronizarContadorCarrinho);
  preencherAno();

  return config;
}

/** Faixa amarela fixa avisando que a loja esta em modo de teste. */
export function aplicarFaixaTeste(config) {
  const container = document.querySelector('[data-faixa-teste]');
  if (!container) return;

  if (!config || !config.modo_teste) {
    container.innerHTML = '';
    document.documentElement.style.setProperty('--faixa-teste-altura', '0px');
    return;
  }

  const simulacao = config.simulacao;
  const mensagem = simulacao
    ? 'Nenhuma credencial configurada: os pedidos são <strong>fictícios (simulação)</strong> e nada e enviado ao Mercado Pago.'
    : 'Pagamentos processados com <strong>credenciais de teste</strong>. Nenhum valor real e cobrado — use os cartões de teste do Mercado Pago.';

  container.innerHTML = `
    <div class="faixa-teste" role="status">
      <div class="faixa-teste__interno">
        <span class="faixa-teste__selo">${simulacao ? 'Modo simulação' : 'Modo de teste'}</span>
        <span class="faixa-teste__texto">${mensagem}</span>
        <a href="/diagnostico.html">Ver diagnostico das credenciais</a>
      </div>
    </div>`;

  // Mantem o cabecalho sticky abaixo da faixa.
  requestAnimationFrame(() => {
    const altura = container.firstElementChild?.getBoundingClientRect().height || 0;
    document.documentElement.style.setProperty('--faixa-teste-altura', `${Math.round(altura)}px`);
  });
}

/**
 * Marca o link do menu da pagina atual.
 * O Cloudflare Pages serve URLs limpas (/catalogo e /catalogo.html), por isso
 * a comparacao normaliza os dois lados antes de decidir.
 */
function marcarLinkAtivo(pagina) {
  const normalizar = (caminho) => {
    let valor = String(caminho || '').split('?')[0].split('#')[0];
    valor = valor.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (valor.length > 1 && valor.endsWith('/')) valor = valor.slice(0, -1);
    return valor || '/';
  };

  const atual = normalizar(pagina ? `/${pagina}` : window.location.pathname);
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (normalizar(link.getAttribute('href')) === atual) {
      link.setAttribute('aria-current', 'page');
    }
  });
}

/** Atualiza todos os contadores de carrinho da pagina. */
export function sincronizarContadorCarrinho() {
  const quantidade = contarItens();
  document.querySelectorAll('[data-contador-carrinho]').forEach((elemento) => {
    elemento.textContent = String(quantidade);
    elemento.classList.toggle('escondido-visualmente', quantidade === 0);
  });
  document.querySelectorAll('[data-rotulo-carrinho]').forEach((elemento) => {
    elemento.textContent = quantidade === 0 ? 'Carrinho vazio' : `${quantidade} item(ns) no carrinho`;
  });
}

function preencherAno() {
  document.querySelectorAll('[data-ano]').forEach((elemento) => {
    elemento.textContent = String(new Date().getFullYear());
  });
}

/* ------------------------------- toasts ---------------------------------- */

/** Mostra um aviso flutuante. tipo: 'info' | 'sucesso' | 'erro' */
export function avisar(mensagem, tipo = 'info', duracao = 4200) {
  let container = document.querySelector('.flutuante');
  if (!container) {
    container = document.createElement('div');
    container.className = 'flutuante';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  toast.innerHTML = esc(mensagem);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 200ms ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 220);
  }, duracao);
}

/** Renderiza um bloco de aviso (nao flutuante) dentro de um container. */
export function blocoAviso(container, { tipo = 'info', titulo = '', texto = '', html = '' }) {
  if (!container) return;
  const classes = {
    teste: 'aviso--teste',
    info: 'aviso--info',
    sucesso: 'aviso--sucesso',
    erro: 'aviso--erro',
    atencao: 'aviso--atencao',
  };
  container.innerHTML = `
    <div class="aviso ${classes[tipo] || classes.info}">
      <div>
        ${titulo ? `<strong>${esc(titulo)}</strong>` : ''}
        ${html || esc(texto)}
      </div>
    </div>`;
}

/** Estado de carregamento padrao. */
export function carregando(container, texto = 'Carregando...') {
  if (!container) return;
  container.innerHTML = `
    <div class="carregando-pagina">
      <span class="girando" aria-hidden="true"></span>
      <span>${esc(texto)}</span>
    </div>`;
}

/** Estado vazio padrao. */
export function estadoVazio(container, { titulo, texto, acao = null }) {
  if (!container) return;
  container.innerHTML = `
    <div class="vazio">
      <h2>${esc(titulo)}</h2>
      <p>${esc(texto)}</p>
      ${acao ? `<a class="botao botao--primario" href="${acao.href}">${esc(acao.rotulo)}</a>` : ''}
    </div>`;
}
