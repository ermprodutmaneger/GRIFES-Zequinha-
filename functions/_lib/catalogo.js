/**
 * Catalogo da loja de demonstracao GRIFES Zequinha.
 *
 * Esta e a UNICA fonte de verdade dos precos. O navegador nunca decide
 * o valor da compra: ele envia apenas `id` + `quantidade` + `tamanho`,
 * e o servidor (Pages Functions) recalcula o total antes de chamar a
 * Orders API do Mercado Pago. Isso evita manipulacao de preco no
 * front-end.
 */

export const LOJA = {
  nome: 'GRIFES Zequinha',
  slogan: 'Alfaiataria e essenciais com acabamento de grife.',
  cidade: 'São Paulo/SP',
  email: 'atendimento@grifeszequinha.com.br',
  telefone: '(11) 4002-8922',
  moeda: 'BRL',
};

/** @type {Array<object>} */
export const PRODUTOS = [
  {
    id: 'GZ-1001',
    slug: 'camisa-linho-sand',
    nome: 'Camisa de Linho Sand',
    categoria: 'Masculino',
    colecao: 'Essenciais',
    preco: 289.9,
    preco_de: 349.9,
    imagem: '/img/produtos/camisa-linho.webp',
    descricao_curta: 'Linho puro com toque amaciado e caimento reto.',
    descricao:
      'Confeccionada em linho puro com lavagem amaciante, a Camisa Sand tem modelagem reta e leve, pensada para dias quentes sem abrir mao da elegancia. Botoes em madrepérola e barra arredondada.',
    composicao: '100% linho',
    cores: ['Sand', 'Off-white', 'Verde-oliva'],
    tamanhos: ['P', 'M', 'G', 'GG'],
    destaque: true,
    lancamento: false,
    estoque: 24,
    peso_kg: 0.35,
  },
  {
    id: 'GZ-1002',
    slug: 'camiseta-pima-preta',
    nome: 'Camiseta Pima Premium',
    categoria: 'Masculino',
    colecao: 'Essenciais',
    preco: 159.9,
    preco_de: null,
    imagem: '/img/produtos/camiseta-pima.webp',
    descricao_curta: 'Algodao Pima peruano de fio longo, gola que não cede.',
    descricao:
      'Tricotada em algodão Pima peruano de fio extra-longo, oferece maciez superior, menos bolinhas e maior durabilidade. Gola reforçada com elastano que não deforma.',
    composicao: '95% algodão Pima, 5% elastano',
    cores: ['Preto', 'Branco', 'Cinza-mescla'],
    tamanhos: ['P', 'M', 'G', 'GG', 'XG'],
    destaque: true,
    lancamento: false,
    estoque: 60,
    peso_kg: 0.22,
  },
  {
    id: 'GZ-1003',
    slug: 'calca-alfaiataria-grafite',
    nome: 'Calça de Alfaiataria Grafite',
    categoria: 'Masculino',
    colecao: 'Alfaiataria',
    preco: 379.9,
    preco_de: 429.9,
    imagem: '/img/produtos/calca-alfaiataria.webp',
    descricao_curta: 'Pantalona de lã fria com prega frontal e caimento impecavel.',
    descricao:
      'Corte slim com prega frontal, cintura com passantes e acabamento interno em viés. Tecido de lam fria com leve stretch para manter o caimento durante todo o dia.',
    composicao: '68% poliester, 30% viscose, 2% elastano',
    cores: ['Grafite', 'Preto', 'Marinho'],
    tamanhos: ['38', '40', '42', '44', '46'],
    destaque: false,
    lancamento: false,
    estoque: 18,
    peso_kg: 0.55,
  },
  {
    id: 'GZ-1004',
    slug: 'jaqueta-couro-caramelo',
    nome: 'Jaqueta de Couro Caramelo',
    categoria: 'Masculino',
    colecao: 'Inverno',
    preco: 1290.0,
    preco_de: 1490.0,
    imagem: '/img/produtos/jaqueta-couro.webp',
    descricao_curta: 'Couro bovino curtido a vegetal com forro acetinado.',
    descricao:
      'A peca-chave do guarda-roupa: couro bovino de espessura media, curtido a vegetal, com ziperes metalicos e forro acetinado. Envelhece ganhando carater a cada uso.',
    composicao: 'Couro bovino, forro 100% poliester',
    cores: ['Caramelo', 'Preto'],
    tamanhos: ['P', 'M', 'G', 'GG'],
    destaque: true,
    lancamento: false,
    estoque: 6,
    peso_kg: 1.4,
  },
  {
    id: 'GZ-2001',
    slug: 'vestido-seda-esmeralda',
    nome: 'Vestido de Seda Esmeralda',
    categoria: 'Feminino',
    colecao: 'Festas',
    preco: 749.9,
    preco_de: null,
    imagem: '/img/produtos/vestido-seda.webp',
    descricao_curta: 'Seda com brilho natural, alcinhas ajustaveis e caimento fluido.',
    descricao:
      'Vestido midi em seda com acabamento em viés frances, decote V discreto e alcinhas regulaveis. Caimento fluido que valoriza a silhueta sem marcar.',
    composicao: '100% seda',
    cores: ['Esmeralda', 'Preto', 'Vinho'],
    tamanhos: ['PP', 'P', 'M', 'G'],
    destaque: true,
    lancamento: true,
    estoque: 9,
    peso_kg: 0.28,
  },
  {
    id: 'GZ-2002',
    slug: 'blazer-alfaiataria-off-white',
    nome: 'Blazer Alfaiataria Off-White',
    categoria: 'Feminino',
    colecao: 'Alfaiataria',
    preco: 589.9,
    preco_de: 659.9,
    imagem: '/img/produtos/blazer-feminino.webp',
    descricao_curta: 'Estruturado, com ombros marcados e botoes dourados.',
    descricao:
      'Blazer de alfaiataria com entretela estruturada, ombros levemente marcados, dois botoes dourados e forro completo. Fecha looks de trabalho a noite com a mesma naturalidade.',
    composicao: '62% viscose, 34% poliester, 4% elastano',
    cores: ['Off-white', 'Preto'],
    tamanhos: ['PP', 'P', 'M', 'G', 'GG'],
    destaque: false,
    lancamento: true,
    estoque: 14,
    peso_kg: 0.68,
  },
  {
    id: 'GZ-3001',
    slug: 'tenis-couro-branco',
    nome: 'Tênis Couro Branco Minimal',
    categoria: 'Calcados',
    colecao: 'Essenciais',
    preco: 459.9,
    preco_de: 519.9,
    imagem: '/img/produtos/tenis-couro.webp',
    descricao_curta: 'Couro legitimo, entressola de borracha e solado costurado.',
    descricao:
      'Tênis minimalista em couro legitimo com forro em couro, palmilha acolchoada removivel e solado costurado. Combina com alfaiataria e com jeans.',
    composicao: 'Couro legitimo, solado em borracha',
    cores: ['Branco', 'Preto'],
    tamanhos: ['38', '39', '40', '41', '42', '43', '44'],
    destaque: true,
    lancamento: false,
    estoque: 21,
    peso_kg: 0.9,
  },
  {
    id: 'GZ-3002',
    slug: 'bolsa-tote-couro-preta',
    nome: 'Bolsa Tote Couro Preta',
    categoria: 'Acessorios',
    colecao: 'Essenciais',
    preco: 899.0,
    preco_de: null,
    imagem: '/img/produtos/bolsa-tote.webp',
    descricao_curta: 'Couro texturizado, alca dupla e compartimento para notebook 14".',
    descricao:
      'Bolsa tote estruturada em couro texturizado com ferragens douradas, alca dupla (mao e ombro) e compartimento interno acolchoado para notebook de até 14 polegadas.',
    composicao: 'Couro bovino texturizado, forro em sarja',
    cores: ['Preto', 'Caramelo'],
    tamanhos: ['Unico'],
    destaque: false,
    lancamento: false,
    estoque: 11,
    peso_kg: 1.1,
  },
];

/** Produtos com selo de destaque na home. */
export function produtosDestaque() {
  return PRODUTOS.filter((p) => p.destaque);
}

/** Busca por id (codigo do SKU). */
export function buscarProdutoPorId(id) {
  return PRODUTOS.find((p) => p.id === id) || null;
}

/** Busca por slug (URL amigavel). */
export function buscarProdutoPorSlug(slug) {
  return PRODUTOS.find((p) => p.slug === slug) || null;
}

/** Lista de categorias unicas, na ordem do catalogo. */
export function categorias() {
  return [...new Set(PRODUTOS.map((p) => p.categoria))];
}

/**
 * Arredonda para 2 casas decimais (BRL) evitando erro de ponto flutuante.
 * @param {number} valor
 * @returns {number}
 */
export function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Formata um numero como string monetaria "0.00" (formato exigido pela
 * Orders API do Mercado Pago, sempre com 2 casas e ponto decimal).
 * @param {number} valor
 * @returns {string}
 */
export function paraValorMP(valor) {
  return arredondar(valor).toFixed(2);
}

/**
 * Valida e normaliza os itens enviados pelo carrinho.
 * Retorna os itens confiaveis (com preco do catalogo) e o subtotal.
 *
 * @param {Array<{id?: string, quantidade?: number, tamanho?: string}>} itensBrutos
 * @param {number} maxItens
 */
export function validarItens(itensBrutos, maxItens = 10) {
  if (!Array.isArray(itensBrutos) || itensBrutos.length === 0) {
    throw new ErroValidacao('Carrinho vazio: envie ao menos um item.', 'carrinho_vazio');
  }
  if (itensBrutos.length > maxItens) {
    throw new ErroValidacao(
      `Muitos itens no pedido (máximo ${maxItens} linhas). Fale com o atendimento.`,
      'carrinho_grande',
    );
  }

  const itens = [];
  for (const bruto of itensBrutos) {
    const produto = buscarProdutoPorId(String(bruto?.id || '').trim());
    if (!produto) {
      throw new ErroValidacao(`Produto não encontrado no catálogo: ${bruto?.id}`, 'produto_invalido');
    }
    const quantidade = Number.parseInt(bruto?.quantidade, 10);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) {
      throw new ErroValidacao(
        `Quantidade inválida para ${produto.nome} (use de 1 a 10).`,
        'quantidade_invalida',
      );
    }
    const tamanho = String(bruto?.tamanho || '').trim() || produto.tamanhos[0];
    if (!produto.tamanhos.includes(tamanho)) {
      throw new ErroValidacao(
        `Tamanho indisponível para ${produto.nome}: ${tamanho}`,
        'tamanho_invalido',
      );
    }
    itens.push({
      id: produto.id,
      slug: produto.slug,
      nome: produto.nome,
      tamanho,
      quantidade,
      preco_unitario: produto.preco,
      categoria: produto.categoria,
      imagem: produto.imagem,
      peso_kg: produto.peso_kg,
    });
  }

  const subtotal = arredondar(
    itens.reduce((total, item) => total + item.preco_unitario * item.quantidade, 0),
  );

  return { itens, subtotal };
}

/** Erro de validacao com codigo proprio, virando HTTP 400 na API. */
export class ErroValidacao extends Error {
  /**
   * @param {string} mensagem
   * @param {string} codigo
   */
  constructor(mensagem, codigo = 'dados_invalidos') {
    super(mensagem);
    this.name = 'ErroValidacao';
    this.codigo = codigo;
  }
}
