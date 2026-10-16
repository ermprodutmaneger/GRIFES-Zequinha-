/**
 * GET /api/config
 *
 * Devolve a configuracao PUBLICA da loja para o front-end.
 * Nao existe nenhum segredo aqui: a public key e publica por definicao e o
 * access token e apenas informado como "configurado: true/false".
 */

import { configuracaoPublica, lerConfiguracao } from '../_lib/mercado-pago.js';
import { json, preflight } from '../_lib/respostas.js';

export async function onRequestGet({ env }) {
  const config = lerConfiguracao(env);
  return json(configuracaoPublica(config));
}

export async function onRequestOptions() {
  return preflight();
}
