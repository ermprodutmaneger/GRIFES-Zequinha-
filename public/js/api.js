/**
 * Cliente da API interna (Cloudflare Pages Functions).
 *
 * Nada aqui fala direto com o Mercado Pago: o navegador conversa apenas com
 * /api/* do proprio site, e o servidor guarda o ACCESS_TOKEN.
 */

let configEmCache = null;

/**
 * Requisicao para a API interna com tratamento de erro padronizado.
 * @param {string} caminho  ex.: '/api/produtos'
 * @param {RequestInit & { corpo?: object }} [opcoes]
 */
export async function api(caminho, opcoes = {}) {
  const { corpo, ...resto } = opcoes;
  const resposta = await fetch(caminho, {
    headers: corpo ? { 'content-type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    ...resto,
  });

  let dados = null;
  const texto = await resposta.text();
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = { erro: texto };
  }

  if (!resposta.ok) {
    const erro = new Error(dados?.erro || `Falha na requisicao (${resposta.status})`);
    erro.status = resposta.status;
    erro.codigo = dados?.codigo;
    erro.detalhes = dados?.detalhes;
    erro.payload = dados;
    throw erro;
  }

  return dados;
}

/** Configuracao publica da loja (public key, modo de teste, avisos). */
export async function carregarConfig({ recarregar = false } = {}) {
  if (configEmCache && !recarregar) return configEmCache;
  configEmCache = await api('/api/config');
  return configEmCache;
}

/** Catalogo completo (fonte de precos usada para exibir). */
export async function carregarProdutos() {
  const dados = await api('/api/produtos');
  return dados?.produtos || [];
}

/** Um produto pelo slug. */
export async function carregarProduto(slug) {
  const dados = await api(`/api/produtos?slug=${encodeURIComponent(slug)}`);
  return dados?.produto || null;
}

/** Frete simulado por CEP. */
export async function calcularFrete({ cep, itens }) {
  return api('/api/frete', { method: 'POST', corpo: { cep, itens } });
}

/** Cria o pedido (Orders API). */
export async function criarPedido(dados) {
  return api('/api/orders', { method: 'POST', corpo: dados });
}

/** Consulta o status atualizado do pedido. */
export async function consultarPedido(id) {
  return api(`/api/orders/${encodeURIComponent(id)}`);
}
