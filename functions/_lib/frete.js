/**
 * Frete FICTICIO (simulado) da loja de demonstracao.
 *
 * Nada aqui consulta os Correios / Mercado Envios. O calculo e por faixas
 * de CEP + peso, so para o fluxo de checkout ficar realista e para o valor
 * do frete entrar no `total_amount` da Orders API.
 *
 * Se quiser trocar por um calculo real depois, basta substituir
 * `calcularOpcoesDeFrete` mantendo o mesmo formato de retorno.
 */

import { arredondar } from './catalogo.js';

/** Onde a loja despacha (usado para estimar o prazo). */
export const ORIGEM = { cep: '01310-100', cidade: 'São Paulo', uf: 'SP' };

/**
 * Opcoes de frete oferecidas no carrinho.
 * - `economico` : PAC-like (mais barato, mais devagar)
 * - `expresso`  : SEDEX-like
 * - `retirada`  : retirada no atelier (grids, sem custo)
 */
export const MODALIDADES = [
  {
    id: 'economico',
    nome: 'Entrega Econômica',
    transportadora: 'GZ Log (simulado)',
    dias_min: 5,
    dias_max: 9,
    observacao: 'Frete grátis para compras acima do valor definido pela loja.',
  },
  {
    id: 'expresso',
    nome: 'Entrega Expressa',
    transportadora: 'GZ Express (simulado)',
    dias_min: 2,
    dias_max: 4,
    observacao: 'Coleta no mesmo dia para pedidos confirmados até 14h.',
  },
  {
    id: 'retirada',
    nome: 'Retirar no Atelier',
    transportadora: 'Retirada em loja (simulado)',
    dias_min: 1,
    dias_max: 2,
    observacao: 'Rua Augusta, 1500 — São Paulo/SP. Sem custo de frete.',
  },
];

/**
 * Normaliza CEP para 8 digitos.
 * @param {string} cep
 * @returns {string}
 */
export function somenteDigitos(cep) {
  return String(cep || '').replace(/\D/g, '');
}

/**
 * Valida o CEP (8 digitos, formato brasileiro).
 * @param {string} cep
 */
export function validarCep(cep) {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8 || /^0{8}$/.test(digitos)) {
    throw new Error('CEP inválido: informe 8 dígitos (ex.: 01310-100).');
  }
  return digitos;
}

/**
 * Faixa de CEP: usada para variar o valor e o prazo (fica realista
 * sem depender de nenhum servico externo).
 * @param {string} cepDigitos
 */
function faixaDaRegiao(cepDigitos) {
  const prefixo = Number.parseInt(cepDigitos.slice(0, 2), 10);
  if (cepDigitos.startsWith('0')) {
    return { regiao: 'Grande São Paulo', multiplicador: 1, dias_extras: 0, sigla: 'SP-INTERIOR' };
  }
  if (prefixo <= 19) return { regiao: 'Estado de São Paulo', multiplicador: 1.15, dias_extras: 1, sigla: 'SP' };
  if (prefixo <= 28) return { regiao: 'Rio de Janeiro / ES', multiplicador: 1.35, dias_extras: 2, sigla: 'RJ-ES' };
  if (prefixo <= 39) return { regiao: 'Minas Gerais', multiplicador: 1.35, dias_extras: 2, sigla: 'MG' };
  if (prefixo <= 49) return { regiao: 'Bahia / Sergipe', multiplicador: 1.6, dias_extras: 4, sigla: 'BA-SE' };
  if (prefixo <= 56) return { regiao: 'Pernambuco / Alagoas', multiplicador: 1.65, dias_extras: 4, sigla: 'PE-AL' };
  if (prefixo <= 63) return { regiao: 'Ceará / Piauí / RN / PB', multiplicador: 1.7, dias_extras: 5, sigla: 'NE' };
  if (prefixo <= 69) return { regiao: 'Norte', multiplicador: 1.85, dias_extras: 7, sigla: 'NORTE' };
  if (prefixo <= 79) return { regiao: 'Centro-Oeste', multiplicador: 1.5, dias_extras: 3, sigla: 'CENTRO-OESTE' };
  if (prefixo <= 88) return { regiao: 'Paraná / Santa Catarina', multiplicador: 1.3, dias_extras: 2, sigla: 'SUL' };
  return { regiao: 'Rio Grande do Sul', multiplicador: 1.45, dias_extras: 3, sigla: 'RS' };
}

/** Peso cubico aproximado do carrinho (kg). */
export function pesoDoCarrinho(itens) {
  const peso = itens.reduce((total, item) => total + (item.peso_kg || 0.3) * item.quantidade, 0);
  return Math.max(0.3, arredondar(peso));
}

/**
 * Calcula as opcoes de frete simuladas.
 *
 * @param {object} params
 * @param {string} params.cep             CEP de destino (com ou sem mascara)
 * @param {Array<object>} params.itens    Itens validados (com peso_kg e quantidade)
 * @param {number} params.subtotal        Subtotal em BRL
 * @param {number} [params.freteGratisAcimaDe] Regra de frete gratis da loja
 * @returns {{cep:string, origem:object, regiao:string, peso_kg:number, subtotal:number, opcoes:Array<object>, frete_gratis:boolean}}
 */
export function calcularOpcoesDeFrete({ cep, itens, subtotal, freteGratisAcimaDe = 299.9 }) {
  const cepDigitos = validarCep(cep);
  const faixa = faixaDaRegiao(cepDigitos);
  const peso = pesoDoCarrinho(itens);
  const gratis = subtotal >= Number(freteGratisAcimaDe);

  // Base do calculo: R$ 14,90 + R$ 4,20 por kg + R$ 6,00 fixos de manuseio.
  const base = 14.9 + peso * 4.2 + 6;

  const opcoes = MODALIDADES.map((modalidade) => {
    let valor;
    if (modalidade.id === 'retirada') {
      valor = 0;
    } else if (modalidade.id === 'economico') {
      valor = gratis ? 0 : arredondar(base * faixa.multiplicador);
    } else {
      // Expresso sempre custa mais que o economico simulado.
      valor = arredondar((base * faixa.multiplicador) * 1.9);
    }

    const diasExtras = modalidade.id === 'expresso' ? 0 : faixa.dias_extras;
    const diasMin = modalidade.dias_min + diasExtras;
    const diasMax = modalidade.dias_max + diasExtras;

    return {
      id: modalidade.id,
      nome: modalidade.nome,
      transportadora: modalidade.transportadora,
      valor,
      gratis: valor === 0,
      prazo_dias: { min: diasMin, max: diasMax },
      prazo_texto:
        modalidade.id === 'retirada'
          ? `Pronto para retirada em ${diasMin} dia(s) útil(eis)`
          : `${diasMin} a ${diasMax} dias úteis`,
      previsao_entrega: previsaoDeEntrega(diasMax),
      observacao:
        modalidade.id === 'economico' && gratis && subtotal > 0
          ? 'Frete grátis aplicado para o seu carrinho. (simulado)'
          : modalidade.observacao,
    };
  });

  return {
    cep: formatarCep(cepDigitos),
    origem: ORIGEM,
    regiao: faixa.regiao,
    peso_kg: peso,
    subtotal,
    frete_gratis: gratis,
    aviso: 'Cálculo de frete SIMULADO — nenhuma transportadora foi consultada.',
    opcoes,
  };
}

/**
 * Retorna a opcao de frete pelo id (ou lanca erro de validacao).
 * @param {string} id
 * @param {ReturnType<typeof calcularOpcoesDeFrete>} calculo
 */
export function escolherOpcao(id, calculo) {
  const opcao = calculo.opcoes.find((o) => o.id === id);
  if (!opcao) {
    const erro = new Error(`Opção de frete inválida: ${id}`);
    erro.codigo = 'frete_invalido';
    throw erro;
  }
  return opcao;
}

/** 01310100 -> 01310-100 */
export function formatarCep(cep) {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return String(cep || '');
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

/** Data prevista a partir de hoje, em dias uteis aproximados. */
function previsaoDeEntrega(dias) {
  const data = new Date();
  let uteis = 0;
  while (uteis < dias) {
    data.setDate(data.getDate() + 1);
    const dia = data.getDay();
    if (dia !== 0 && dia !== 6) uteis += 1;
  }
  return data.toISOString().slice(0, 10);
}
