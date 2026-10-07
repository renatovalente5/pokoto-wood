#!/usr/bin/env node
// O CAMINHO DO CLIENTE: o que a dona vai fazer no painel, feito ao conteúdo, e o gerador a correr
// sobre cada resultado (memória testar-o-caminho-do-cliente). Para cada mudança, o gerador tem de
// acabar bem, OU parar com uma mensagem que diga o que fazer — nunca rebentar com um TypeError.
//
//   node scripts/testar-caminhos.mjs            todas as mudanças (uns 2 minutos)
//   node scripts/testar-caminhos.mjs site       só as que têm «site» no nome
//
// Mudanças: apagar cada chave e esvaziar cada texto de site.json, inicio.json e categorias.json;
// apagar cada entrada de fotos.json; em cada artigo, apagar cada campo, escondê-lo, mudá-lo para
// cada categoria, tirar-lhe as fotografias e dar-lhe um complemento que não existe.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTEUDO = path.join(RAIZ, 'content');
const filtro = process.argv[2] || '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pokoto-caminhos-'));
const lerJ = (rel) => JSON.parse(fs.readFileSync(path.join(CONTEUDO, rel), 'utf8'));

// todas as folhas e nós de um objecto, como caminhos ['a', 0, 'b']
function caminhos(v, pref = []) {
  const out = [];
  const filhos = Array.isArray(v) ? v.map((x, i) => [i, x]) : v && typeof v === 'object' ? Object.entries(v) : [];
  for (const [k, x] of filhos) { out.push([...pref, k]); out.push(...caminhos(x, [...pref, k])); }
  return out;
}
const apagar = (o, c) => { const pai = c.slice(0, -1).reduce((x, k) => x[k], o); const k = c[c.length - 1]; if (Array.isArray(pai)) pai.splice(k, 1); else delete pai[k]; };
const valorEm = (o, c) => c.reduce((x, k) => x[k], o);
const por = (o, c, v) => { const pai = c.slice(0, -1).reduce((x, k) => x[k], o); pai[c[c.length - 1]] = v; };

const mudancas = [];
for (const f of ['site.json', 'inicio.json', 'categorias.json']) {
  const o = lerJ(f);
  for (const c of caminhos(o)) {
    mudancas.push({ nome: `${f}: apagar ${c.join('.')}`, ficheiro: f, fazer: (x) => apagar(x, c) });
    if (typeof valorEm(o, c) === 'string') mudancas.push({ nome: `${f}: esvaziar ${c.join('.')}`, ficheiro: f, fazer: (x) => por(x, c, '') });
  }
}
for (const n of Object.keys(lerJ('fotos.json'))) {
  mudancas.push({ nome: `fotos.json: apagar ${n}`, ficheiro: 'fotos.json', fazer: (x) => { delete x[n]; } });
  mudancas.push({ nome: `fotos.json: sem descrição ${n}`, ficheiro: 'fotos.json', fazer: (x) => { x[n].alt = ''; } });
}
const cats = lerJ('categorias.json').map((c) => c.slug);
for (const f of fs.readdirSync(path.join(CONTEUDO, 'produtos'))) {
  const rel = `produtos/${f}`;
  const a = lerJ(rel);
  for (const k of Object.keys(a)) mudancas.push({ nome: `${f}: apagar ${k}`, ficheiro: rel, fazer: (x) => { delete x[k]; } });
  mudancas.push({ nome: `${f}: esconder`, ficheiro: rel, fazer: (x) => { x.publicado = false; } });
  mudancas.push({ nome: `${f}: sem fotografias`, ficheiro: rel, fazer: (x) => { x.fotos = []; } });
  mudancas.push({ nome: `${f}: preço vazio`, ficheiro: rel, fazer: (x) => { x.preco = null; } });
  mudancas.push({ nome: `${f}: complemento que não existe`, ficheiro: rel, fazer: (x) => { x.complementos = [{ produto: 'nao-existe', envioExtra: { continente: 1, ilhas: 1, espanha: 1 } }]; } });
  mudancas.push({ nome: `${f}: portes vazios`, ficheiro: rel, fazer: (x) => { x.envio = { continente: null, ilhas: null, espanha: null }; } });
  for (const c of cats) if (c !== a.categoria) mudancas.push({ nome: `${f}: categoria ${c}`, ficheiro: rel, fazer: (x) => { x.categoria = c; } });
}

const escolhidas = mudancas.filter((m) => m.nome.includes(filtro));
let certos = 0;
const falhas = [];
const correr = (m, i) => new Promise((resolve) => {
  const pasta = path.join(tmp, String(i));
  fs.cpSync(CONTEUDO, path.join(pasta, 'content'), { recursive: true });
  const alvo = path.join(pasta, 'content', m.ficheiro);
  const obj = JSON.parse(fs.readFileSync(alvo, 'utf8'));
  m.fazer(obj);
  fs.writeFileSync(alvo, JSON.stringify(obj, null, 2) + '\n');
  const p = spawn(process.execPath, [path.join(RAIZ, 'scripts/build.mjs'), '--sem-imagens', `--conteudo=${path.join(pasta, 'content')}`, `--saida=${path.join(pasta, '_site')}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = '';
  p.stdout.on('data', (d) => { saida += d; });
  p.stderr.on('data', (d) => { saida += d; });
  p.on('close', (codigo) => {
    const rebentou = /TypeError|ReferenceError|SyntaxError|RangeError|\n\s+at .+\(.+:\d+:\d+\)/.test(saida);
    const parouComMensagem = codigo === 1 && /A publicação parou/.test(saida);
    if (!rebentou && (codigo === 0 || parouComMensagem)) certos++;
    else falhas.push(`${m.nome}\n    ${saida.trim().split('\n').slice(-6).join('\n    ')}`);
    fs.rmSync(pasta, { recursive: true, force: true });
    resolve();
  });
});

const fila = escolhidas.map((m, i) => () => correr(m, i));
const PARALELO = Math.max(2, Math.min(8, os.cpus().length));
await Promise.all(Array.from({ length: PARALELO }, async () => { while (fila.length) await fila.shift()(); }));
fs.rmSync(tmp, { recursive: true, force: true });
for (const f of falhas) console.error(`✗ ${f}`);
console.log(`caminhos do cliente: ${certos} certos, ${falhas.length} falhas (${escolhidas.length} mudanças)`);
process.exit(falhas.length ? 1 : 0);
