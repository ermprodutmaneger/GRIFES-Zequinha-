import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';

const BASE = 'http://127.0.0.1:8777';
const OUT = '/home/user/GRIFES-Zequinha-/ingrid-beauty/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const exePath = await chromium.executablePath();
const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox', '--font-render-hinting=none'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  executablePath: exePath,
  headless: 'shell',
});

const erros = [];
async function novaPagina(viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on('console', (m) => { if (m.type() === 'error') erros.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', (e) => erros.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', (r) => erros.push('REQFAIL: ' + r.url().slice(0, 100) + ' ' + r.failure()?.errorText));
  return page;
}
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- LOADER (primeiro acesso) ----------
const lp = await novaPagina({ width: 1440, height: 900 });
await lp.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await lp.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
await lp.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await esperar(650);
await lp.screenshot({ path: `${OUT}/desktop-loader.png` });
const loaderInfo = await lp.evaluate(() => {
  const l = document.getElementById('loader');
  return l ? { presente: true, opacidade: getComputedStyle(l).opacity, classe: l.className, frase: document.querySelector('.loader-phrase')?.textContent } : { presente: false };
});
console.log('LOADER (0,9s)', JSON.stringify(loaderInfo));
await esperar(1400);
const loaderDepois = await lp.evaluate(() => !!document.getElementById('loader'));
console.log('LOADER apos 2,3s ->', loaderDepois ? 'ainda no DOM (saindo)' : 'removido');
await lp.close();

// ---------- DESKTOP ----------
const page = await novaPagina({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
await esperar(2500);

const info = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('.card-media .img, .hero-foto-img, .sobre-foto-img, .espaco-foto, .brand-logo, .hero-logo, .wa-avatar .img')];
  const hero = document.querySelector('.hero-photo');
  return {
    loaderPresente: !!document.getElementById('loader'),
    cards: document.querySelectorAll('.card').length,
    imagensComFundo: imgs.filter(el => getComputedStyle(el).backgroundImage !== 'none').length,
    imagensTotal: imgs.length,
    heroAltura: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
    heroVisivel: hero ? getComputedStyle(hero).clipPath : '',
    contadorOculto: document.querySelector('#contador-topo').hidden,
    titulo: document.title,
    h1: document.querySelector('h1').innerText.replace(/\n/g, ' | '),
    horarios: [...document.querySelectorAll('.horarios tr')].map(tr => tr.innerText.replace(/\n/g, ': ')),
  };
});
console.log('INFO', JSON.stringify(info, null, 2));

await page.screenshot({ path: `${OUT}/desktop-hero.png` });

// hero completo (rolagem ate a foto)
await page.evaluate(() => window.scrollTo(0, 260));
await esperar(700);
await page.screenshot({ path: `${OUT}/desktop-hero-foto.png` });

// sobre
await page.evaluate(() => document.querySelector('#sobre').scrollIntoView());
await esperar(1400);
await page.screenshot({ path: `${OUT}/desktop-sobre.png` });

// catalogo + filtro
await page.evaluate(() => document.querySelector('#procedimentos').scrollIntoView());
await esperar(1200);
await page.screenshot({ path: `${OUT}/desktop-procedimentos.png` });
const filtro = await page.evaluate(() => {
  document.querySelector('[data-filter="cilios"]').click();
  const visiveis = [...document.querySelectorAll('.card')].filter(c => c.offsetParent !== null).map(c => c.dataset.id);
  document.querySelector('[data-filter="todos"]').click();
  const todos = [...document.querySelectorAll('.card')].filter(c => c.offsetParent !== null).length;
  return { cílios: visiveis, todos };
});
console.log('FILTROS', JSON.stringify(filtro));

// modal
await page.evaluate(() => document.querySelector('.card [data-detalhes]').click());
await esperar(900);
await page.screenshot({ path: `${OUT}/desktop-modal.png` });
const modalInfo = await page.evaluate(() => ({
  titulo: document.querySelector('#modal-titulo').textContent,
  duracao: document.querySelector('#modal-duracao').textContent,
  preco: document.querySelector('#modal-preco').textContent,
  img: getComputedStyle(document.querySelector('#modal-img')).backgroundImage.slice(0, 40),
}));
console.log('MODAL', JSON.stringify(modalInfo));
await page.keyboard.press('Escape');
await esperar(700);
console.log('MODAL fechou com ESC ->', await page.evaluate(() => document.querySelector('#modal-procedimento').hidden));

// apenas avaliacao -> total a consultar
await page.evaluate(() => {
  document.querySelector('.card[data-id="avaliacao"] [data-add]').click();
});
await esperar(500);
const soAvaliacao = await page.evaluate(() => ({
  total: document.querySelector('#total-valor').textContent,
  barra: document.querySelector('#barra-total').textContent,
}));
console.log('SO AVALIACAO', JSON.stringify(soAvaliacao));

// adiciona mais e confere o total
await page.evaluate(() => {
  document.querySelector('.card[data-id="brow-lamination"] [data-add]').click();
  document.querySelector('.card[data-id="combo-glow-facial"] [data-add]').click();
});
await esperar(700);
const totais = await page.evaluate(() => ({
  itens: document.querySelectorAll('.agenda-item').length,
  total: document.querySelector('#total-valor').textContent,
  aval: document.querySelector('#total-avaliacao').textContent,
  contador: document.querySelector('#contador-topo').textContent,
}));
console.log('TOTAIS', JSON.stringify(totais));

// duplicidade
await page.evaluate(() => document.querySelector('.card[data-id="brow-lamination"] [data-add]').click());
await esperar(400);
console.log('DUPLICIDADE itens =', await page.evaluate(() => document.querySelectorAll('.agenda-item').length));

// remove
await page.evaluate(() => document.querySelector('.agenda-item [data-remover]').click());
await esperar(400);
console.log('APOS REMOVER itens =', await page.evaluate(() => document.querySelectorAll('.agenda-item').length));

// abre agenda, escolhe data (quinta) e periodo da manha
await page.evaluate(() => document.querySelector('#btn-agenda-topo').click());
await esperar(1100);
await page.evaluate(() => {
  document.querySelectorAll('.agenda-item [data-remover]').forEach(b => b.click());
});
await esperar(600);
const horarios = await page.evaluate(() => {
  const data = document.querySelector('#campo-data');
  data.value = '2026-10-22';
  data.dispatchEvent(new Event('change', { bubbles: true }));
  const periodo = document.querySelector('#campo-periodo');
  periodo.value = 'manhã';
  periodo.dispatchEvent(new Event('change', { bubbles: true }));
  const hora = document.querySelector('#campo-hora');
  return { opcoes: [...hora.options].map(o => o.textContent), dica: document.querySelector('#dica-horario').textContent };
});
console.log('HORARIOS (quinta, manha)', JSON.stringify(horarios, null, 2));

// segunda-feira -> so tarde
const seg = await page.evaluate(() => {
  const data = document.querySelector('#campo-data');
  data.value = '2026-10-26';
  data.dispatchEvent(new Event('change', { bubbles: true }));
  return {
    periodo: document.querySelector('#campo-periodo').value,
    dica: document.querySelector('#dica-data').textContent,
    opcoes: [...document.querySelector('#campo-hora').options].map(o => o.textContent),
  };
});
console.log('SEGUNDA-FEIRA', JSON.stringify(seg, null, 2));

// domingo -> bloqueado
const dom = await page.evaluate(() => {
  const data = document.querySelector('#campo-data');
  data.value = '2026-10-25';
  data.dispatchEvent(new Event('change', { bubbles: true }));
  return { erro: document.querySelector('#erro-data').textContent, valor: data.value };
});
console.log('DOMINGO', JSON.stringify(dom));

// data passada -> bloqueada
const passou = await page.evaluate(() => {
  const data = document.querySelector('#campo-data');
  data.value = '2020-01-01';
  data.dispatchEvent(new Event('change', { bubbles: true }));
  return { erro: document.querySelector('#erro-data').textContent, valor: data.value };
});
console.log('DATA PASSADA', JSON.stringify(passou));

// mensagem final (readiciona procedimentos)
await page.evaluate(() => {
  document.querySelector('.card[data-id="brow-lamination"] [data-add]').click();
  document.querySelector('.card[data-id="combo-glow-facial"] [data-add]').click();
  document.querySelector('.card[data-id="avaliacao"] [data-add]').click();
});
await esperar(700);
const mensagem = await page.evaluate(() => {
  const data = document.querySelector('#campo-data');
  data.value = '2026-10-22';
  data.dispatchEvent(new Event('change', { bubbles: true }));
  const hora = document.querySelector('#campo-hora');
  hora.value = [...hora.options].map(o => o.value).filter(Boolean)[0] || '';
  hora.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('#campo-nome').value = 'Ana Paula';
  document.querySelector('#campo-nome').dispatchEvent(new Event('input', { bubbles: true }));
  let capturado = null;
  const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.href) capturado = this.href; };
  document.querySelector('#enviar-whatsapp').click();
  HTMLAnchorElement.prototype.click = orig;
  return capturado ? decodeURIComponent(capturado.split('text=')[1]) : null;
});
console.log('MENSAGEM WHATSAPP:\n' + mensagem);
await page.screenshot({ path: `${OUT}/desktop-agenda.png` });

// persistencia no localStorage
await page.reload({ waitUntil: 'networkidle0' });
await esperar(1200);
console.log('PERSISTENCIA itens apos reload =', await page.evaluate(() => document.querySelectorAll('.agenda-item').length));

// lightbox
await page.evaluate(() => document.querySelector('#espaco').scrollIntoView());
await esperar(900);
await page.screenshot({ path: `${OUT}/desktop-espaco.png` });
await page.evaluate(() => document.querySelector('#btn-lightbox').click());
await esperar(900);
await page.screenshot({ path: `${OUT}/desktop-lightbox.png` });
await page.keyboard.press('Escape');
await esperar(600);

// como agendar
await page.evaluate(() => document.querySelector('#agendar').scrollIntoView());
await esperar(1000);
await page.screenshot({ path: `${OUT}/desktop-como-agendar.jpg` });

// faq, contato e rodape
await page.evaluate(() => document.querySelector('#faq').scrollIntoView());
await esperar(700);
await page.evaluate(() => document.querySelectorAll('.faq-item')[0].setAttribute('open', ''));
await esperar(500);
await page.screenshot({ path: `${OUT}/desktop-faq.png` });
await page.evaluate(() => document.querySelector('#contato').scrollIntoView());
await esperar(900);
await page.screenshot({ path: `${OUT}/desktop-contato.png` });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await esperar(1100);
await page.screenshot({ path: `${OUT}/desktop-rodape.png` });
await page.close();

// ---------- MOBILE ----------
const m = await novaPagina({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(BASE + '/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
await esperar(2500);
await m.screenshot({ path: `${OUT}/mobile-hero.png` });
await m.evaluate(() => window.scrollTo(0, 400));
await esperar(700);
await m.screenshot({ path: `${OUT}/mobile-hero-foto.png` });

await m.evaluate(() => document.querySelector('#btn-menu').click());
await esperar(1100);
await m.screenshot({ path: `${OUT}/mobile-menu.png` });
await m.keyboard.press('Escape');
await esperar(900);

await m.evaluate(() => document.querySelector('#procedimentos').scrollIntoView());
await esperar(1200);
await m.screenshot({ path: `${OUT}/mobile-procedimentos.png` });

await m.evaluate(() => {
  const cards = [...document.querySelectorAll('.card')];
  cards.find(c => c.dataset.id === 'design-henna-buco').querySelector('[data-add]').click();
});
await esperar(900);
await m.screenshot({ path: `${OUT}/mobile-barra.png` });
await m.evaluate(() => document.querySelector('#btn-ver-agenda').click());
await esperar(1200);
await m.screenshot({ path: `${OUT}/mobile-agenda.png` });

await m.keyboard.press('Escape');
await esperar(800);
await m.evaluate(() => document.querySelector('#contato').scrollIntoView());
await esperar(900);
await m.screenshot({ path: `${OUT}/mobile-contato.png` });
await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await esperar(1000);
await m.screenshot({ path: `${OUT}/mobile-rodape.png` });

const mob = await m.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  barraVisivel: document.querySelector('#barra-mobile').classList.contains('show'),
}));
console.log('MOBILE', JSON.stringify(mob, null, 2));

console.log('\n=== ERROS (' + erros.length + ') ===');
erros.slice(0, 30).forEach(e => console.log(e));
await browser.close();
