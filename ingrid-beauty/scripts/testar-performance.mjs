import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';

const BASE = 'http://127.0.0.1:8779';
const OUT = '/home/user/GRIFES-Zequinha-/ingrid-beauty/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const exePath = await chromium.executablePath();
const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox'],
  executablePath: exePath,
  headless: 'shell',
});

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

// ---------------- DESKTOP: versao com pasta img/ ----------------
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const reqs = [];
  let bytes = 0;
  page.on('response', async (r) => {
    try {
      const len = Number(r.headers()['content-length'] || 0);
      bytes += len;
      reqs.push({ url: r.url().split('/').pop(), type: r.request().resourceType(), len });
    } catch (e) {}
  });
  const erros = [];
  page.on('pageerror', e => erros.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push('CONSOLE ' + m.text()); });
  page.on('requestfailed', r => erros.push('REQFAIL ' + r.url()));

  await page.goto(BASE + '/versao-imagens/index.html', { waitUntil: 'networkidle0' });
  await esperar(2000);

  const inicial = {
    requisicoes: reqs.length,
    kb: Math.round(bytes / 1024),
    imagens: reqs.filter(r => r.type === 'image').map(r => r.url),
  };
  console.log('=== CARGA INICIAL (desktop, versao com pasta img/) ===');
  console.log('requisicoes:', inicial.requisicoes, '| transferidos:', inicial.kb, 'KB');
  console.log('imagens carregadas no inicio:', inicial.imagens.length, inicial.imagens.join(', '));

  // rola ate o fim e confere se todas as imagens entram
  await page.evaluate(async () => {
    const passo = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += passo) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await esperar(1500);
  const depois = await page.evaluate(() => {
    const todas = [...document.querySelectorAll('.img')];
    return {
      total: todas.length,
      comFundo: todas.filter(e => getComputedStyle(e).backgroundImage !== 'none').length,
      pendentes: todas.filter(e => getComputedStyle(e).backgroundImage === 'none').map(e => e.getAttribute('aria-label')),
    };
  });
  console.log('apos rolar tudo ->', JSON.stringify(depois));
  console.log('ERROS:', erros.length, erros.slice(0, 5).join(' | '));
  await page.close();
}

// ---------------- MOBILE: medicao de carga ----------------
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const reqs = [];
  let bytes = 0;
  page.on('response', (r) => {
    const len = Number(r.headers()['content-length'] || 0);
    bytes += len;
    reqs.push(r.request().resourceType());
  });
  const erros = [];
  page.on('pageerror', e => erros.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push('CONSOLE ' + m.text()); });

  const t0 = Date.now();
  await page.goto(BASE + '/versao-imagens/index.html', { waitUntil: 'load' });
  const tLoad = Date.now() - t0;
  await esperar(1200);

  const mobile = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = performance.getEntriesByType('paint').map(p => p.name + ':' + Math.round(p.startTime));
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
      paints,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      fontes: [...document.fonts].length,
    };
  });
  console.log('\n=== MOBILE (390px) ===');
  console.log('load:', tLoad + 'ms', '| requisicoes:', reqs.length, '| transferidos:', Math.round(bytes / 1024), 'KB');
  console.log(JSON.stringify(mobile, null, 2));

  await page.screenshot({ path: `${OUT}/mobile-otimizado-topo.jpg`, type: 'jpeg', quality: 88 });
  await page.evaluate(() => window.scrollTo(0, 900));
  await esperar(900);
  await page.screenshot({ path: `${OUT}/mobile-otimizado-meio.jpg`, type: 'jpeg', quality: 88 });
  console.log('ERROS:', erros.length, erros.slice(0, 5).join(' | '));
  await page.close();
}

await browser.close();
