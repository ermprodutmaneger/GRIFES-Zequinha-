/**
 * Confirmacao do pedido: mostra o status vindo da Orders API, o QR Code do Pix,
 * a linha digitavel do boleto e permite reconsultar o status.
 */

import { consultarPedido } from '../api.js';
import { lerUltimoPedido, mesclarPedido } from '../carrinho.js';
import { brl, data, dataHora, esc } from '../formato.js';
import { avisar, blocoAviso, carregando, estadoVazio, iniciarLayout } from '../layout.js';

const container = document.getElementById('status-pedido');
const parametros = new URLSearchParams(window.location.search);
const idPedido = parametros.get('id');
const simuladoPelaUrl = parametros.get('simulado') === '1';

let pedidoAtual = null;

/** Botao de copiar (Pix copia e cola / linha digitavel). */
function montarCopiavel(valor) {
  const id = `campo-${Math.random().toString(36).slice(2, 8)}`;
  return `
    <div class="codigo-copiavel">
      <input id="${id}" type="text" readonly value="${esc(valor)}" aria-label="Codigo para copiar">
      <button class="botao botao--contorno botao--pequeno" type="button" data-copiar="${id}">Copiar</button>
    </div>`;
}

document.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('[data-copiar]');
  if (!botao) return;
  const campo = document.getElementById(botao.dataset.copiar);
  if (!campo) return;
  try {
    await navigator.clipboard.writeText(campo.value);
    avisar('Codigo copiado.', 'sucesso');
  } catch {
    campo.select();
    avisar('Selecione e copie manualmente (Ctrl+C).', 'info');
  }
});

function seloStatus(pedido) {
  const tom = pedido.status_tom || 'neutro';
  return `<span class="status-caixa__selo status-caixa__selo--${esc(tom)}">${esc(pedido.status_rotulo)}</span>`;
}

function blocoPagamentoAprovado(pedido) {
  return `
    <div class="aviso aviso--sucesso">
      <div>
        <strong>Pagamento confirmado</strong>
        O Mercado Pago aprovou o pagamento. Em uma loja real, este e o momento de separar e enviar o pedido.
      </div>
    </div>`;
}

function blocoPendente(pedido) {
  const pix = pedido?.pagamento?.pix;
  const boleto = pedido?.pagamento?.boleto;

  if (pix?.codigo_copia_e_cola || pix?.imagem_base64) {
    return `
      <div class="pix-caixa">
        ${
          pix.imagem_base64
            ? `<img src="data:image/png;base64,${esc(pix.imagem_base64)}" alt="QR Code do Pix para pagamento">`
            : `<div class="pix-caixa__placeholder">QR Code do Pix disponível no aplicativo do Mercado Pago (modo de teste)</div>`
        }
        <div>
          <h3 style="margin-top:0">Pague com Pix para confirmar</h3>
          <p>Abra o app do seu banco, escolha Pix &gt; Ler QR Code (ou Pix Cópia e Cola) e finalize. O status e atualizado automaticamente.</p>
          ${pix.codigo_copia_e_cola ? montarCopiavel(pix.codigo_copia_e_cola) : ''}
        </div>
      </div>`;
  }

  if (boleto?.url || boleto?.linha_digitavel) {
    return `
      <div class="aviso aviso--atencao">
        <div>
          <strong>Boleto gerado</strong>
          O boleto já está disponível. Em modo de teste o pagamento pode ser simulado no próprio site do Mercado Pago.
          ${boleto.linha_digitavel ? montarCopiavel(boleto.linha_digitavel) : ''}
          ${boleto.url ? `<p style="margin:.75rem 0 0"><a class="botao botao--contorno botao--pequeno" href="${esc(boleto.url)}" target="_blank" rel="noopener">Abrir boleto</a></p>` : ''}
        </div>
      </div>`;
  }

  return `
    <div class="aviso aviso--atencao">
      <div>
        <strong>Pagamento pendente</strong>
        Estamos aguardando a confirmacao do Mercado Pago. Use o botao <em>Reconsultar status</em> para atualizar.
      </div>
    </div>`;
}

function blocosExtras(pedido) {
  const blocos = [];

  if (pedido.status === 'rejected' || pedido.status === 'failed' || pedido.status === 'cancelled') {
    blocos.push(`
      <div class="aviso aviso--erro">
        <div>
          <strong>Pagamento não aprovado</strong>
          ${esc(pedido.status_descricao || '')}
          ${pedido.status_detalhe ? `<br><small>Motivo informado (<code>status_detail</code>): ${esc(pedido.status_detalhe)}</small>` : ''}
          <p style="margin:.75rem 0 0">Tente novamente com outro cartão ou escolha Pix/boleto no checkout.</p>
        </div>
      </div>`);
  }

  if (pedido.status === 'in_process') {
    blocos.push(`
      <div class="aviso aviso--info">
        <div><strong>Em análise</strong> O Mercado Pago está avaliando o pagamento (análise de risco). Você será avisado quando houver uma definição.</div>
      </div>`);
  }

  if (simuladoPelaUrl || pedido.simulado) {
    blocos.push(`
      <div class="aviso aviso--teste">
        <div>
          <strong>Pedido SIMULADO (nada foi enviado ao Mercado Pago)</strong>
          Este pedido existe apenas neste navegador porque a loja está sem credenciais configuradas.
          Configure <code>MP_PUBLIC_KEY</code> e <code>MP_ACCESS_TOKEN</code> de teste para gerar pedidos reais de teste.
          <a class="link-simples" href="/diagnostico.html">Abrir diagnostico →</a>
        </div>
      </div>`);
  } else {
    blocos.push(`
      <div class="aviso aviso--teste">
        <div>
          <strong>Ambiente de teste do Mercado Pago</strong>
          Este pedido foi processado com credenciais de teste: nenhum valor real foi cobrado.
          Consulte <a class="link-simples" href="https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/test/cards" target="_blank" rel="noopener">os cartões de teste</a> para simular aprovacao, pendência e recusa.
        </div>
      </div>`);
  }

  // 3-D Secure / desafio do banco emissor.
  if (pedido.pagamento?.redirect_url) {
    blocos.push(`
      <div class="aviso aviso--atencao">
        <div>
          <strong>Validação extra do banco (3-D Secure)</strong>
          O emissor do cartão pediu uma confirmacao adicional. Conclua a validação para liberar o pagamento:
          <p style="margin:.75rem 0 0">
            <a class="botao botao--primario botao--pequeno" href="${esc(pedido.pagamento.redirect_url)}">Concluir validação</a>
          </p>
        </div>
      </div>`);
  }

  return blocos.join('');
}

function renderizar(pedido) {
  const itens = pedido.itens || [];
  const frete = pedido.frete;

  container.innerHTML = `
    <div class="status-caixa">
      ${seloStatus(pedido)}
      <h1 style="margin:0 0 .35rem">${esc(tituloDoStatus(pedido))}</h1>
      <p style="color:var(--tinta-3);margin-bottom:1.25rem">
        ${esc(pedido.status_descricao || '')}
        ${pedido.id ? `<br><small>Pedido <code>${esc(pedido.id)}</code> · referencia <code>${esc(pedido.referencia_externa || '—')}</code></small>` : ''}
      </p>

      ${pedido.status === 'approved' ? blocoPagamentoAprovado(pedido) : ''}
      ${['pending', 'in_process'].includes(pedido.status) ? blocoPendente(pedido) : ''}

      <div class="dados-pedido">
        <div><dt>Valor total</dt><dd>${brl(pedido.valor_total ?? 0)}</dd></div>
        <div><dt>Pago</dt><dd>${brl(pedido.valor_pago ?? 0)}</dd></div>
        <div><dt>Forma de pagamento</dt><dd>${esc(descreverPagamento(pedido))}</dd></div>
        <div><dt>Criado em</dt><dd>${esc(dataHora(pedido.criado_em))}</dd></div>
        <div><dt>Comprador</dt><dd>${esc(pedido.cliente_email || '—')}</dd></div>
        <div><dt>Frete (simulado)</dt><dd>${
          frete ? `${esc(frete.nome)} — ${frete.gratis ? 'gratis' : brl(frete.valor)}${frete.prazo_texto ? ` · ${esc(frete.prazo_texto)}` : ''}` : '—'
        }</dd></div>
      </div>

      ${
        pedido.entrega
          ? `<p style="margin-top:1rem;font-size:.88rem;color:var(--tinta-3)">
              <strong>Entrega:</strong> ${esc(pedido.entrega.rua)}, ${esc(pedido.entrega.numero)}
              ${pedido.entrega.complemento ? ` — ${esc(pedido.entrega.complemento)}` : ''} ·
              ${esc(pedido.entrega.bairro)} · ${esc(pedido.entrega.cidade)}/${esc(pedido.entrega.uf)} ·
              CEP ${esc(pedido.entrega.cep)}
              ${frete?.previsao_entrega ? `<br><strong>Previsão:</strong> ${esc(data(frete.previsao_entrega))}` : ''}
            </p>`
          : ''
      }

      ${
        itens.length
          ? `<hr class="separador">
             <h3>Itens do pedido</h3>
             <div class="rolagem-horizontal">
               <table class="tabela">
                 <thead><tr><th>Produto</th><th>Tamanho</th><th>Qtd.</th><th>Unitario</th><th>Total</th></tr></thead>
                 <tbody>
                   ${itens
                     .map(
                       (item) => `
                     <tr>
                       <td>${esc(item.nome)}${item.id ? ` <small style="color:var(--tinta-3)">(${esc(item.id)})</small>` : ''}</td>
                       <td>${esc(item.tamanho || '—')}</td>
                       <td>${esc(item.quantidade || item.qtd || 1)}</td>
                       <td>${brl(item.preco_unitario || 0)}</td>
                       <td>${brl((item.preco_unitario || 0) * (item.quantidade || item.qtd || 1))}</td>
                     </tr>`,
                     )
                     .join('')}
                 </tbody>
               </table>
             </div>`
          : ''
      }

      ${blocosExtras(pedido)}

      <div class="acoes-pedido">
        <button class="botao botao--primario" type="button" id="reconsultar">Reconsultar status</button>
        <a class="botao botao--contorno" href="/catalogo.html">Continuar comprando</a>
        <button class="botao botao--contorno" type="button" onclick="window.print()">Imprimir</button>
      </div>
    </div>`;

  document.getElementById('reconsultar')?.addEventListener('click', reconsultar);
}

function tituloDoStatus(pedido) {
  switch (pedido.status) {
    case 'approved':
      return 'Obrigado! Pagamento aprovado.';
    case 'pending':
      return 'Falta pouco: pague para confirmar.';
    case 'in_process':
      return 'Pagamento em análise.';
    case 'rejected':
    case 'failed':
      return 'Pagamento não aprovado.';
    case 'cancelled':
      return 'Pedido cancelado.';
    default:
      return 'Pedido registrado.';
  }
}

function descreverPagamento(pedido) {
  const pagamento = pedido.pagamento || {};
  const tipo = pagamento.metodo_tipo || '';
  const bandeira = pagamento.metodo_id || '';
  if (tipo === 'credit_card' || tipo === 'debit_card') {
    const parcelas = pagamento.parcelas ? ` · ${pagamento.parcelas}x${pagamento.valor_parcela ? ` de ${brl(pagamento.valor_parcela)}` : ''}` : '';
    return `Cartão ${bandeira}${parcelas}`;
  }
  if (tipo === 'ticket') return 'Boleto bancario';
  if (tipo === 'bank_transfer') return 'Pix';
  return bandeira || tipo || '—';
}

async function carregarPedido({ mostrarCarregando = true } = {}) {
  const salvo = lerUltimoPedido();
  const parametrosApi = new URLSearchParams();
  if (salvo?.total) parametrosApi.set('total', String(salvo.total));
  if (salvo?.subtotal) parametrosApi.set('subtotal', String(salvo.subtotal));
  // Necessario para o pedido simulado continuar mostrando Pix/boleto/parcelas.
  if (salvo?.pagamento?.metodo) parametrosApi.set('metodo', String(salvo.pagamento.metodo));
  if (salvo?.pagamento?.metodo_tipo) parametrosApi.set('metodo', String(salvo.pagamento.metodo_tipo));
  if (salvo?.pagamento?.parcelas) parametrosApi.set('parcelas', String(salvo.pagamento.parcelas));
  if (salvo?.pagamento?.metodo_id) parametrosApi.set('payment_method_id', String(salvo.pagamento.metodo_id));

  const sufixo = parametrosApi.toString() ? `?${parametrosApi.toString()}` : '';
  const resposta = await consultarPedido(`${idPedido}${sufixo}`);
  return mesclarPedido(salvo, resposta.pedido);
}

async function reconsultar() {
  avisar('Consultando o Mercado Pago...', 'info');
  try {
    pedidoAtual = await carregarPedido();
    renderizar(pedidoAtual);
    avisar(`Status atual: ${pedidoAtual.status_rotulo}.`, 'sucesso');
  } catch (e) {
    avisar(e?.message || 'Não foi possível reconsultar o pedido.', 'erro');
  }
}

async function iniciar() {
  await iniciarLayout({ pagina: 'confirmacao.html' });

  if (!idPedido) {
    estadoVazio(container, {
      titulo: 'Nenhum pedido informado',
      texto: 'Abra a confirmacao a partir do checkout ou volte para o catálogo.',
      acao: { href: '/catalogo.html', rotulo: 'Ir para o catálogo' },
    });
    return;
  }

  carregando(container, 'Consultando o pedido...');

  try {
    pedidoAtual = await carregarPedido();
    renderizar(pedidoAtual);
    document.title = `Pedido ${pedidoAtual.referencia_externa || idPedido} — GRIFES Zequinha`;

    // O link do Pix/boleto muda sozinho enquanto o pagamento estiver pendente.
    if (['pending', 'in_process'].includes(pedidoAtual.status)) {
      setTimeout(() => reconsultar(), 15000);
    }
  } catch (e) {
    container.innerHTML = '';
    blocoAviso(container, {
      tipo: 'erro',
      titulo: 'Não foi possível carregar o pedido',
      html: `${esc(e?.message || 'Erro inesperado.')}
        ${
          e?.codigo === 'modo_simulacao'
            ? '<br><br>Dica: pedidos simulados ficam salvos no próprio navegador. Este pedido não existe no Mercado Pago.'
            : ''
        }`,
    });
  }
}

iniciar();
