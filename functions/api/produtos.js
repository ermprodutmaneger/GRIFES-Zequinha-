/**
 * GET /api/produtos
 * GET /api/produtos?destaques=true
 * GET /api/produtos?slug=camisa-linho-sand
 *
 * Catalogo da loja (mesma base usada para recalcular os precos no checkout).
 */

import { PRODUTOS, categorias, produtosDestaque } from '../_lib/catalogo.js';
import { lerConfiguracao } from '../_lib/mercado-pago.js';
import { json, preflight } from '../_lib/respostas.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const config = lerConfiguracao(env);

  let lista = PRODUTOS;

  if (url.searchParams.get('destaques') === 'true') {
    lista = produtosDestaque();
  }

  const slug = url.searchParams.get('slug');
  if (slug) {
    const produto = lista.find((p) => p.slug === slug);
    if (!produto) {
      return json({ ok: false, erro: `Produto não encontrado: ${slug}` }, 404);
    }
    return json({ ok: true, modo_teste: config.modoTeste, produto });
  }

  const categoria = url.searchParams.get('categoria');
  if (categoria) {
    lista = lista.filter((p) => p.categoria.toLowerCase() === categoria.toLowerCase());
  }

  return json({
    ok: true,
    modo_teste: config.modoTeste,
    simulacao: config.simulacao,
    total: lista.length,
    categorias: categorias(),
    produtos: lista,
  });
}

export async function onRequestOptions() {
  return preflight();
}
