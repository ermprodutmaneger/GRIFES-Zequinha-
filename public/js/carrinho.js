/**
 * Carrinho de compras (estado local no navegador).
 *
 * Guarda apenas ID + TAMANHO + QUANTIDADE + frete escolhido. Os PRECOS nunca
 * ficam no localStorage como fonte de verdade: sao sempre relidos do catalogo
 * (/api/produtos) e recalculados no servidor antes de falar com o Mercado Pago.
 */

const CHAVE_CARRINHO = 'gz_carrinho_v2';
const CHAVE_PEDIDO = 'gz_ultimo_pedido_v1';

const CARRINHO_VAZIO = { itens: [], frete_id: 'economico', cep: '', atualizado_em: null };

/* ------------------------------- leitura --------------------------------- */

export function lerCarrinho() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || 'null');
    if (!bruto || !Array.isArray(bruto.itens)) return { ...CARRINHO_VAZIO };
    return {
      ...CARRINHO_VAZIO,
      ...bruto,
      itens: bruto.itens.filter((i) => i && i.id && i.quantidade > 0),
    };
  } catch {
    return { ...CARRINHO_VAZIO };
  }
}

function salvar(carrinho) {
  const atualizado = { ...carrinho, atualizado_em: new Date().toISOString() };
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(atualizado));
  document.dispatchEvent(new CustomEvent('carrinho:alterado', { detail: atualizado }));
  return atualizado;
}

/* ------------------------------- escrita --------------------------------- */

/** Soma quantidade se o mesmo produto+tamanho ja estiver no carrinho. */
export function adicionarItem({ id, tamanho, quantidade = 1 }) {
  const carrinho = lerCarrinho();
  const existente = carrinho.itens.find((i) => i.id === id && i.tamanho === tamanho);
  if (existente) {
    existente.quantidade = Math.min(10, existente.quantidade + quantidade);
  } else {
    carrinho.itens.push({ id, tamanho, quantidade: Math.min(10, Math.max(1, quantidade)) });
  }
  return salvar(carrinho);
}

export function atualizarQuantidade({ id, tamanho, quantidade }) {
  const carrinho = lerCarrinho();
  const item = carrinho.itens.find((i) => i.id === id && i.tamanho === tamanho);
  if (!item) return carrinho;
  if (quantidade <= 0) {
    carrinho.itens = carrinho.itens.filter((i) => !(i.id === id && i.tamanho === tamanho));
  } else {
    item.quantidade = Math.min(10, quantidade);
  }
  return salvar(carrinho);
}

export function removerItem({ id, tamanho }) {
  const carrinho = lerCarrinho();
  carrinho.itens = carrinho.itens.filter((i) => !(i.id === id && i.tamanho === tamanho));
  return salvar(carrinho);
}

export function limparCarrinho() {
  return salvar({ ...CARRINHO_VAZIO });
}

/** Guarda a escolha de frete (id da modalidade) e o CEP informado. */
export function definirFrete({ frete_id, cep }) {
  const carrinho = lerCarrinho();
  if (frete_id) carrinho.frete_id = frete_id;
  if (typeof cep === 'string') carrinho.cep = cep;
  return salvar(carrinho);
}

export function contarItens() {
  return lerCarrinho().itens.reduce((total, item) => total + item.quantidade, 0);
}

/** Itens no formato aceito pela API (/api/frete e /api/orders). */
export function itensParaApi() {
  return lerCarrinho().itens.map((i) => ({ id: i.id, quantidade: i.quantidade, tamanho: i.tamanho }));
}

/* ---------------------------- juncao com o catalogo ---------------------- */

/**
 * Junta os itens do carrinho com os dados/precos do catalogo.
 * @param {Array<object>} produtos
 */
export function detalharItens(produtos) {
  const carrinho = lerCarrinho();
  const porId = new Map(produtos.map((p) => [p.id, p]));

  const itens = carrinho.itens
    .map((item) => {
      const produto = porId.get(item.id);
      if (!produto) return null;
      const precoUnitario = produto.preco;
      return {
        ...item,
        produto,
        nome: produto.nome,
        imagem: produto.imagem,
        slug: produto.slug,
        categoria: produto.categoria,
        preco_unitario: precoUnitario,
        subtotal: Math.round(precoUnitario * item.quantidade * 100) / 100,
      };
    })
    .filter(Boolean);

  const subtotal = Math.round(itens.reduce((total, item) => total + item.subtotal, 0) * 100) / 100;

  return { itens, subtotal, quantidade: itens.reduce((t, i) => t + i.quantidade, 0), frete_id: carrinho.frete_id, cep: carrinho.cep };
}

/* --------------------------- ultimo pedido ------------------------------- */

export function salvarUltimoPedido(pedido) {
  try {
    localStorage.setItem(CHAVE_PEDIDO, JSON.stringify({ ...pedido, salvo_em: new Date().toISOString() }));
  } catch {
    /* localStorage cheio/indisponivel: a confirmacao recarrega pela API */
  }
}

export function lerUltimoPedido() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PEDIDO) || 'null');
  } catch {
    return null;
  }
}

/** Junta o pedido salvo localmente com o status atualizado vindo da API. */
export function mesclarPedido(pedidoSalvo, pedidoApi) {
  if (!pedidoApi) return pedidoSalvo;
  return {
    ...pedidoSalvo,
    ...pedidoApi,
    itens: pedidoApi.itens?.length ? pedidoApi.itens : pedidoSalvo?.itens || [],
    subtotal: pedidoApi.subtotal ?? pedidoSalvo?.subtotal ?? null,
    frete: pedidoApi.frete ?? pedidoSalvo?.frete ?? null,
  };
}
