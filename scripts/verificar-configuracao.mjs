#!/usr/bin/env node
/**
 * npm run check
 * ---------------------------------------------------------------------------
 * Verificacao rapida da configuracao da loja ANTES de subir para o Cloudflare
 * Pages. Nao faz chamadas de rede: apenas confere arquivos, variaveis e a
 * presenca (ou nao) de credenciais reais no repositorio.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const raiz = process.cwd();
const problemas = [];
const avisos = [];
const ok = [];

const existe = (rel) => fs.existsSync(path.join(raiz, rel));

/* 1. Estrutura minima ---------------------------------------------------- */
const obrigatorios = [
  'wrangler.toml',
  'public/index.html',
  'public/catalogo.html',
  'public/produto.html',
  'public/carrinho.html',
  'public/checkout.html',
  'public/confirmacao.html',
  'public/diagnostico.html',
  'public/css/estilos.css',
  'public/js/paginas/checkout.js',
  'functions/api/orders.js',
  'functions/api/orders/[id].js',
  'functions/api/frete.js',
  'functions/api/config.js',
  'functions/_lib/mercado-pago.js',
  'functions/_lib/catalogo.js',
  'functions/_lib/frete.js',
];
const faltando = obrigatorios.filter((arquivo) => !existe(arquivo));
if (faltando.length) problemas.push(`Arquivos ausentes: ${faltando.join(', ')}`);
else ok.push(`Estrutura completa (${obrigatorios.length} arquivos essenciais).`);

/* 2. Assets de imagem --------------------------------------------------- */
const produtos = ['camisa-linho', 'camiseta-pima', 'calca-alfaiataria', 'jaqueta-couro', 'vestido-seda', 'blazer-feminino', 'tenis-couro', 'bolsa-tote'];
const imagensFaltando = produtos.filter((nome) => !existe(`public/img/produtos/${nome}.webp`));
if (imagensFaltando.length) avisos.push(`Imagens de produto faltando: ${imagensFaltando.join(', ')}`);
else ok.push(`Imagens dos ${produtos.length} produtos encontradas (WebP otimizado).`);
if (existe('public/img/logo-grifes-zequinha.svg')) ok.push('Logo SVG presente.');

/* 3. .gitignore protege as credenciais ---------------------------------- */
const gitignore = existe('.gitignore') ? fs.readFileSync(path.join(raiz, '.gitignore'), 'utf8') : '';
if (!/^\.dev\.vars$/m.test(gitignore)) problemas.push('.gitignore nao ignora o arquivo .dev.vars (risco de vazar o access token).');
else ok.push('.gitignore ignora .dev.vars (credenciais locais protegidas).');
if (!/^\.env$/m.test(gitignore) && !/^\.env\.\*$/m.test(gitignore)) {
  problemas.push('.gitignore nao ignora arquivos .env.');
}

/* 4. Variaveis de ambiente --------------------------------------------- */
const devVarsExiste = existe('.dev.vars');
const textoDevVars = devVarsExiste ? fs.readFileSync(path.join(raiz, '.dev.vars'), 'utf8') : '';
const lerVariavel = (conteudo, nome) => (conteudo.match(new RegExp(`^${nome}\\s*=\\s*"?([^"\\n]*)"?`, 'm')) || [])[1]?.trim() || '';

const publicKey = lerVariavel(textoDevVars, 'MP_PUBLIC_KEY');
const accessToken = lerVariavel(textoDevVars, 'MP_ACCESS_TOKEN');

if (!devVarsExiste) {
  avisos.push('Sem .dev.vars: em desenvolvimento a loja roda em MODO SIMULACAO. Copie .dev.vars.example para .dev.vars e cole as credenciais de TESTE.');
} else if (!publicKey || !accessToken) {
  avisos.push('.dev.vars existe, mas MP_PUBLIC_KEY e/ou MP_ACCESS_TOKEN estao vazios: a loja ficara em MODO SIMULACAO.');
} else {
  ok.push(`Credenciais locais presentes (${publicKey.slice(0, 8)}... / ${accessToken.slice(0, 8)}...).`);
  if (!publicKey.startsWith('TEST-') && !accessToken.startsWith('TEST-')) {
    const marcadaComoTeste = /^MP_CREDENCIAL_TESTE\s*=\s*"?true"?/m.test(textoDevVars);
    if (marcadaComoTeste) {
      ok.push('Credenciais com prefixo APP_USR- marcadas como de teste (MP_CREDENCIAL_TESTE=true) — aplicação criada em conta de teste.');
    } else {
      avisos.push(
        'As credenciais NAO tem o prefixo TEST-. Se a aplicacao pertence a uma CONTA DE TESTE (comum: apps novos usam APP_USR-), defina MP_CREDENCIAL_TESTE="true" para manter a faixa de aviso.',
      );
    }
  }
  if (/^APP_USR-/.test(accessToken) && publicKey.startsWith('TEST-')) {
    avisos.push('Public key de teste + access token APP_USR: mistura possivel de credenciais. Use o par completo da mesma aplicacao.');
  }
}

/* 5. Nenhum segredo comitado no codigo --------------------------------- */
const arquivosPublicos = [];
const coletar = (dir) => {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) coletar(completo);
    else if (/\.(js|html|css|json|txt|toml)$/.test(entrada.name)) arquivosPublicos.push(completo);
  }
};
if (existe('public')) coletar(path.join(raiz, 'public'));
if (existe('functions')) coletar(path.join(raiz, 'functions'));

const padroesSegredo = [/(TEST|APP_USR)-\d{6,}-\d{4,}/, /APP_USR-\d{12,}/, /sk-[A-Za-z0-9]{20,}/];
const suspeitos = arquivosPublicos.filter((arquivo) => {
  const conteudo = fs.readFileSync(arquivo, 'utf8');
  return padroesSegredo.some((padrao) => padrao.test(conteudo));
});
if (suspeitos.length) {
  problemas.push(`Possivel credencial embutida no codigo: ${suspeitos.map((a) => path.relative(raiz, a)).join(', ')}`);
} else {
  ok.push('Nenhuma credencial embutida em public/ ou functions/ (ACCESS_TOKEN so via variavel de ambiente).');
}

/* 6. Access token nunca LIDO no front-end ------------------------------ */
// Cita-lo em textos/documentacao e permitido; le-lo em runtime nao e.
const padroesDeLeitura = [
  /process\.env(\.|\[)['"]?MP_ACCESS_TOKEN/,
  /env(\.|\[)['"]?MP_ACCESS_TOKEN/,
  /(const|let|var)\s+ACCESS_TOKEN\s*=/,
  /Authorization['"]?\s*:\s*[`'"]Bearer/,
];
const frontComToken = arquivosPublicos
  .filter((arquivo) => arquivo.includes(`${path.sep}public${path.sep}`))
  .filter((arquivo) => padroesDeLeitura.some((padrao) => padrao.test(fs.readFileSync(arquivo, 'utf8'))));
if (frontComToken.length) problemas.push(`O front-end parece ler/tokenizar o access token: ${frontComToken.map((a) => path.relative(raiz, a)).join(', ')}`);
else ok.push('O front-end nunca le o ACCESS_TOKEN (apenas /api/config devolve a public key).');

/* Relatorio ------------------------------------------------------------- */
const simbolo = { ok: '\u2714', aviso: '\u26a0', erro: '\u2716' };
console.log('\n  VERIFICACAO DA LOJA GRIFES ZEQUINHA\n  ' + '─'.repeat(52));
for (const linha of ok) console.log(`  ${simbolo.ok} ${linha}`);
for (const linha of avisos) console.log(`  ${simbolo.aviso} ${linha}`);
for (const linha of problemas) console.log(`  ${simbolo.erro} ${linha}`);
console.log('  ' + '─'.repeat(52));

if (problemas.length) {
  console.log(`  ${problemas.length} problema(s) critico(s). Corrija antes do deploy.\n`);
  process.exit(1);
}
console.log(avisos.length ? '  Pronto para deploy (com avisos).\n' : '  Tudo pronto: rode `npm run dev` e abra http://localhost:8788\n');
