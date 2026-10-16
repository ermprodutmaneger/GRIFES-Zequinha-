/**
 * POST /api/frete
 *
 * Calculo de frete FICTICIO (simulado) por CEP + peso do carrinho.
 * Corpo: { cep: "01310-100", itens: [{id, quantidade, tamanho}] }
 */

import { ErroValidacao, validarItens } from '../_lib/catalogo.js';
import { calcularOpcoesDeFrete } from '../_lib/frete.js';
import { lerConfiguracao } from '../_lib/mercado-pago.js';
import { erro, json, lerJson, preflight } from '../_lib/respostas.js';

export async function onRequestPost({ request, env }) {
  const config = lerConfiguracao(env);

  try {
    const corpo = await lerJson(request);
    const cep = String(corpo?.cep || '').trim();
    if (!cep) {
      return erro('Informe o CEP para calcular o frete.', 400, { codigo: 'cep_obrigatorio' });
    }

    const { itens, subtotal } = validarItens(corpo?.itens, config.maxItens);

    const calculo = calcularOpcoesDeFrete({
      cep,
      itens,
      subtotal,
      freteGratisAcimaDe: config.freteGratisAcimaDe,
    });

    return json({
      ok: true,
      modo_teste: config.modoTeste,
      simulado: true,
      ...calculo,
    });
  } catch (e) {
    if (e instanceof ErroValidacao || e?.codigo === 'frete_invalido' || e?.status === 400) {
      return erro(e.message, 400, { codigo: e.codigo || 'validacao' });
    }
    return erro('Não foi possível calcular o frete simulado.', 400, {
      codigo: 'frete_indisponivel',
      detalhes: e?.message,
    });
  }
}

export async function onRequestOptions() {
  return preflight();
}
