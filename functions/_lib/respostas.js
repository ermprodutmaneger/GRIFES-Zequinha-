/**
 * Helpers de resposta HTTP usados pelas Pages Functions.
 */

/**
 * Resposta JSON padronizada.
 * @param {unknown} dados
 * @param {number} status
 * @param {Record<string,string>} [headers]
 */
export function json(dados, status = 200, headers = {}) {
  return new Response(JSON.stringify(dados, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // As respostas da API nunca devem ser cacheadas (tem status de pagamento).
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

/**
 * Resposta de erro padronizada: { erro, codigo, detalhes? }
 * @param {string} mensagem
 * @param {number} status
 * @param {object} [extra]
 */
export function erro(mensagem, status = 400, extra = {}) {
  return json({ ok: false, erro: mensagem, ...extra }, status);
}

/** Le e valida JSON do corpo da requisicao. */
export async function lerJson(request) {
  const tipo = request.headers.get('content-type') || '';
  if (!tipo.includes('application/json')) {
    throw Object.assign(new Error('Envie o corpo como application/json.'), { status: 415 });
  }
  const texto = await request.text();
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch {
    throw Object.assign(new Error('JSON inválido no corpo da requisicao.'), { status: 400 });
  }
}

/** Trata preflight CORS (util para testar via curl/Postman). */
export function preflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  });
}
