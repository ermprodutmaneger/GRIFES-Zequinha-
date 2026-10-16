/**
 * Pagina de diagnostico: checklist das credenciais do Mercado Pago,
 * passo a passo de configuracao e cartoes de teste.
 */

import { api } from '../api.js';
import { esc } from '../formato.js';
import { carregando, iniciarLayout } from '../layout.js';

const containerResumo = document.getElementById('resumo-diagnostico');
const containerChecklist = document.getElementById('checklist');
const containerPassos = document.getElementById('proximos-passos');
const containerExemplos = document.getElementById('exemplos');

const ICONES = { ok: '✓', pendente: '•', atencao: '!', erro: '×' };

function renderizarResumo(dados) {
  const resumo = dados.resumo || {};
  const tom = resumo.simulacao ? 'atencao' : resumo.pronto_para_teste ? 'sucesso' : 'atencao';

  const titulo = resumo.simulacao
    ? 'Modo simulação — credenciais não configuradas'
    : resumo.modo_teste
      ? 'Pronto para testar com credenciais de teste'
      : 'Credenciais de producao detectadas';

  containerResumo.innerHTML = `
    <div class="aviso aviso--${tom === 'sucesso' ? 'sucesso' : tom === 'atencao' ? 'atencao' : 'info'}">
      <div>
        <strong>${esc(titulo)}</strong>
        ${
          resumo.simulacao
            ? 'Os pedidos são fictícios e não chegam ao Mercado Pago. Siga os passos abaixo para colar as credenciais de TESTE e testar o checkout de verdade.'
            : 'A loja está usando credenciais de teste: nenhum valor real e cobrado. Use os cartões e usuarios de teste para validar todos os cenarios.'
        }
        ${resumo.pendencia_critica ? `<br><br><small>${esc(resumo.pendencia_critica)}</small>` : ''}
      </div>
    </div>

    <div class="dados-pedido">
      <div><dt>MP_PUBLIC_KEY</dt><dd>${esc(dados.variaveis.public_key_mascarada || 'não configurada')}</dd></div>
      <div><dt>MP_ACCESS_TOKEN</dt><dd>${esc(dados.variaveis.access_token_mascarado || 'não configurado')}</dd></div>
      <div><dt>Modo</dt><dd>${esc(dados.variaveis.modo || 'auto')}</dd></div>
      <div><dt>Credencial de teste</dt><dd>${dados.variaveis.credencial_teste ? 'sim' : 'não identificada'}</dd></div>
      <div><dt>Simulação</dt><dd>${dados.variaveis.simulacao ? 'ativa' : 'desativada'}</dd></div>
      <div><dt>Faixa de aviso</dt><dd>${dados.variaveis.modo_teste ? 'visível' : 'oculta'}</dd></div>
    </div>`;
}

function renderizarChecklist(dados) {
  containerChecklist.innerHTML = (dados.checklist || [])
    .map(
      (item) => `
      <li class="checklist__item">
        <span class="checklist__icone checklist__icone--${esc(item.status)}" aria-hidden="true">${ICONES[item.status] || '•'}</span>
        <div>
          <p class="checklist__titulo">${esc(item.item)}</p>
          <p class="checklist__mensagem">${esc(item.mensagem)}</p>
          ${item.esperado ? `<p class="checklist__esperado">esperado: ${esc(item.esperado)}</p>` : ''}
        </div>
      </li>`,
    )
    .join('');
}

function renderizarPassos(dados) {
  containerPassos.innerHTML = `
    <ol style="padding-left:1.2rem;display:grid;gap:.5rem;margin:0 0 1.5rem">
      ${(dados.proximos_passos || []).map((passo) => `<li>${esc(passo)}</li>`).join('')}
    </ol>`;
}

function renderizarExemplos() {
  containerExemplos.innerHTML = `
    <h3>1. Variaveis de ambiente esperadas</h3>
    <p>Nomes exatamente como o backend le (<code>functions/_lib/mercado-pago.js</code>):</p>
    <div class="bloco-codigo"><code>MP_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx
MP_MODO=auto
MP_WEBHOOK_SECRET=opcional</code></div>

    <h3 style="margin-top:2rem">2. Onde colar no Cloudflare Pages</h3>
    <p>
      Cloudflare Dashboard → <strong>Workers &amp; Pages</strong> → seu projeto →
      <strong>Settings</strong> → <strong>Variables and Secrets</strong> → <em>Add</em>.
      Marque <code>MP_ACCESS_TOKEN</code> e <code>MP_WEBHOOK_SECRET</code> como
      <strong>Secret</strong> (encrypted) e refaca o deploy para as variaveis valerem.
    </p>

    <h3 style="margin-top:2rem">3. Onde colar localmente</h3>
    <div class="bloco-codigo"><code>cp .dev.vars.example .dev.vars
# edite .dev.vars com as credenciais de TESTE
npm run dev   # http://localhost:8788</code></div>

    <h3 style="margin-top:2rem">4. Onde pegar as credenciais de teste</h3>
    <p>
      Painel do Mercado Pago → <strong>Suas integracoes</strong> (ou "Seu negocio → Configuracoes →
      Gerenciar integracoes e aplicacoes") → selecione sua aplicação → aba
      <strong>Credenciais de teste</strong>. A <em>Public Key</em> e o <em>Access Token</em> de teste
      aparecem nessa tela.
    </p>

    <h3 style="margin-top:2rem">5. Cartões de teste (Brasil — Checkout Transparente)</h3>
    <div class="rolagem-horizontal">
      <table class="tabela">
        <thead><tr><th>Bandeira</th><th>Número</th><th>CVV</th><th>Validade</th><th>Resultado</th></tr></thead>
        <tbody>
          <tr><td>Mastercard</td><td>5031 4332 1540 6351</td><td>123</td><td>11/30</td><td>Aprovado</td></tr>
          <tr><td>Visa</td><td>4235 6477 2802 5682</td><td>123</td><td>11/30</td><td>Aprovado</td></tr>
          <tr><td>Mastercard</td><td>5031 4332 1540 6351</td><td>123</td><td>11/30</td><td>Recusado — use o nome <code>OTHE</code> como titular do cartão</td></tr>
          <tr><td>Visa</td><td>4235 6477 2802 5682</td><td>123</td><td>11/30</td><td>Pendente — use o nome <code>CONT</code> como titular</td></tr>
        </tbody>
      </table>
    </div>
    <p style="margin-top:.75rem;font-size:.85rem;color:var(--tinta-3)">
      Titular (nome impresso) <code>APRO</code> aprova; <code>OTHE</code> recusa; <code>CONT</code> deixa pendente.
      Para Pix/Boleto use o usuario de teste comprador. Detalhes atualizados no
      <a class="link-simples" href="https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/test/cards" target="_blank" rel="noopener">guia oficial de cartões de teste</a>.
    </p>

    <h3 style="margin-top:2rem">6. Endpoints desta loja</h3>
    <div class="bloco-codigo"><code>GET  /api/config           → public key + modo (teste/simulação)
GET  /api/produtos         → catálogo (fonte de precos)
POST /api/frete            → frete simulado por CEP
POST /api/orders           → cria a ordem (POST /v1/orders no Mercado Pago)
GET  /api/orders/{id}      → consulta a ordem (GET /v1/orders/{id})
GET  /api/diagnostico      → este relatorio em JSON
POST /api/webhook          → notificacoes do Mercado Pago</code></div>`;
}

async function iniciar() {
  await iniciarLayout({ pagina: 'diagnostico.html' });
  carregando(containerResumo, 'Lendo configuração...');

  try {
    const dados = await api('/api/diagnostico');
    renderizarResumo(dados);
    renderizarChecklist(dados);
    renderizarPassos(dados);
    renderizarExemplos();
  } catch (e) {
    containerResumo.innerHTML = `
      <div class="aviso aviso--erro">
        <div><strong>Falha ao consultar o diagnostico</strong>${esc(e?.message || 'Erro inesperado.')}</div>
      </div>`;
  }
}

iniciar();
