#!/usr/bin/env node
// As regras dos dados (src/lib/regras.mjs), uma a uma. O painel usa uma cópia byte a byte deste
// ficheiro: o que aqui se prova vale para o painel e para o Worker dele.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../src/lib/regras.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
let certos = 0;
const falhas = [];
const caso = (nome, f) => { try { f(); certos++; } catch (e) { falhas.push(`${nome}: ${e.message}`); } };

const dados = () => ({
  site: ler('content/site.json'), inicio: ler('content/inicio.json'), categorias: ler('content/categorias.json'), fotos: ler('content/fotos.json'),
  artigos: Object.fromEntries(fs.readdirSync(path.join(RAIZ, 'content/produtos')).map((f) => [f.slice(0, -5), ler(`content/produtos/${f}`)])),
  ficheirosFotos: fs.readdirSync(path.join(RAIZ, 'media/fotos')).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)),
  videos: fs.readdirSync(path.join(RAIZ, 'media/video')).filter((f) => f.endsWith('.mp4')).map((f) => f.slice(0, -4)),
});
const artigo = (slug) => JSON.parse(ler(`content/produtos/${slug}.json`));
const chaves = (l) => l.map((p) => p.chave);

// --- ajudantes ---------------------------------------------------------------------
caso('NIF válido e inválido', () => {
  assert.equal(R.nifValido('226 971 740'), true);
  assert.equal(R.nifValido('226971741'), false);
  assert.equal(R.nifValido('026971740'), false);
  assert.equal(R.nifValido(''), false);
});
caso('números portugueses', () => {
  assert.equal(R.numeroPortugues('916 949 456'), '916949456');
  assert.equal(R.numeroPortugues('+351 916949456'), '916949456');
  assert.equal(R.numeroPortugues('00351916949456'), '916949456');
  assert.equal(R.eTelemovel('916949456'), true);
  assert.equal(R.eTelemovel('252 000 000'), false);
  assert.equal(R.numeroPortugues('12345'), null);
});
caso('gerarSlug', () => {
  assert.equal(R.gerarSlug('Torre/Mesa de Aprendizagem'), 'torre-mesa-de-aprendizagem');
  assert.equal(R.gerarSlug('Régua'), 'regua');
  assert.equal(R.gerarSlug('Régua', ['regua']), 'regua-2');
  assert.equal(R.gerarSlug('   '), 'artigo');
});
caso('precoDe: promoção, fim da promoção, sem promoção', () => {
  const p = { preco: 75, precoAnterior: 95, promocaoAte: '2026-12-31' };
  assert.deepEqual(R.precoDe(p, '2026-10-07'), { atual: 75, anterior: 95, ate: '2026-12-31' });
  assert.deepEqual(R.precoDe(p, '2026-12-31'), { atual: 75, anterior: 95, ate: '2026-12-31' });
  assert.deepEqual(R.precoDe(p, '2027-01-01'), { atual: 95, anterior: null, ate: '' });
  assert.deepEqual(R.precoDe({ preco: 65 }, '2026-10-07'), { atual: 65, anterior: null, ate: '' });
});
caso('datas', () => {
  assert.equal(R.dataValida('2026-02-29'), false);
  assert.equal(R.dataValida('2028-02-29'), true);
  assert.equal(R.dataValida('2026-13-01'), false);
});
caso('serializar mantém o ficheiro byte a byte', () => {
  for (const f of fs.readdirSync(path.join(RAIZ, 'content/produtos'))) {
    const t = ler(`content/produtos/${f}`);
    assert.equal(R.serializar(JSON.parse(t), R.terminacaoDe(t)), t, f);
  }
  for (const f of ['site.json', 'inicio.json', 'categorias.json', 'fotos.json']) {
    const t = ler(`content/${f}`);
    assert.equal(R.serializar(JSON.parse(t), R.terminacaoDe(t)), t, f);
  }
});

// --- o conteúdo de hoje ----------------------------------------------------------------
caso('o conteúdo de hoje só tem lembretes', () => {
  const l = R.problemas(dados(), { hoje: '2026-10-07' });
  assert.deepEqual(l.filter((p) => !(p.classe === 'avisa' && p.lembrete)), []);
});
caso('em produção, o IVA e o prazo em falta param a publicação', () => {
  const l = R.problemas(dados(), { hoje: '2026-10-07', producao: true });
  assert.deepEqual(chaves(l.filter((p) => p.classe === 'bloqueia')).sort(), ['site:empresa.iva:vazio:producao', 'site:entrega.prazo:vazio:producao']);
});
caso('todas as fotografias estão em uso', () => {
  const d = dados();
  assert.equal(R.fotosEmUso(d).size, d.ficheirosFotos.length);
});

// --- um artigo -----------------------------------------------------------------------------
const ctx = (extra = {}) => {
  const d = dados();
  const artigos = Object.fromEntries(Object.entries(d.artigos).map(([k, v]) => [k, JSON.parse(v)]));
  return { nome: 'arco-pikler', categorias: ['torres-de-aprendizagem', 'pikler', 'mobiliario-montessori', 'decoracao'], fotos: R.fotosQueExistem(d), artigos, videos: d.videos, hoje: '2026-10-07', ...extra };
};
caso('artigo sem preço fica escondido', () => {
  const a = artigo('arco-pikler'); delete a.preco;
  const l = R.problemasDoArtigo(a, ctx());
  assert.ok(l.some((p) => p.chave === 'artigo:arco-pikler:preco' && p.classe === 'neutraliza' && p.efeito === 'esconder'));
});
caso('preço com três casas decimais não passa', () => {
  const a = artigo('arco-pikler'); a.preco = 10.555;
  assert.ok(R.problemasDoArtigo(a, ctx()).some((p) => p.chave === 'artigo:arco-pikler:preco'));
});
caso('preço anterior menor do que o preço', () => {
  const a = artigo('arco-pikler'); a.precoAnterior = 90;
  assert.ok(R.problemasDoArtigo(a, ctx()).some((p) => p.chave === 'artigo:arco-pikler:precoAnterior' && p.classe === 'avisa'));
});
caso('data de promoção sem preço anterior', () => {
  const a = artigo('estante-montessori'); a.promocaoAte = '2026-12-31';
  assert.ok(R.problemasDoArtigo(a, ctx({ nome: 'estante-montessori' })).some((p) => p.chave === 'artigo:estante-montessori:promocaoAte'));
});
caso('promoção que acabou é só lembrete', () => {
  const l = R.problemasDoArtigo(artigo('arco-pikler'), ctx({ hoje: '2027-01-02' }));
  const p = l.find((x) => x.chave === 'artigo:arco-pikler:promocao-acabou');
  assert.ok(p && p.lembrete);
});
caso('fotografia que não existe sai; sem nenhuma, o artigo esconde-se', () => {
  const a = artigo('arco-pikler'); a.fotos = ['nao-existe'];
  const l = R.problemasDoArtigo(a, ctx());
  assert.ok(l.some((p) => p.efeito === 'sem_fotografia' && p.foto === 'nao-existe'));
  assert.ok(l.some((p) => p.chave === 'artigo:arco-pikler:sem-fotos' && p.efeito === 'esconder'));
});
caso('alegações ambientais escondem o artigo', () => {
  const a = artigo('arco-pikler'); a.resumo = 'Um arco ecológico e sustentável.';
  assert.ok(R.problemasDoArtigo(a, ctx()).some((p) => p.chave === 'artigo:arco-pikler:alegacoes' && p.efeito === 'esconder'));
});
caso('portes inválidos e portes por preencher', () => {
  const a = artigo('arco-pikler'); a.envio = { continente: -1, ilhas: null, espanha: 80 };
  const l = R.problemasDoArtigo(a, ctx());
  assert.ok(l.some((p) => p.campo === 'envio.continente' && p.classe === 'avisa' && !p.lembrete));
  assert.ok(l.some((p) => p.chave === 'artigo:arco-pikler:portes-por-preencher' && p.lembrete));
});
caso('complemento que não existe, e de si próprio', () => {
  const a = artigo('arco-pikler'); a.complementos = [{ produto: 'nao-existe' }, { produto: 'arco-pikler' }];
  const l = R.problemasDoArtigo(a, ctx());
  assert.ok(l.some((p) => p.chave === 'artigo:arco-pikler:complementos.0:nao-existe'));
  assert.ok(l.some((p) => p.chave === 'artigo:arco-pikler:complementos.1:proprio'));
});
caso('prancha sem quem a ofereça é lembrete', () => {
  const d = dados();
  for (const k of ['triangulo-pikler', 'arco-pikler']) { const a = JSON.parse(d.artigos[k]); a.complementos = []; d.artigos[k] = JSON.stringify(a); }
  const l = R.problemas(d, { hoje: '2026-10-07' });
  assert.ok(l.some((p) => p.chave === 'artigo:prancha-dupla-face:complemento-sem-artigo' && p.lembrete));
});

// --- as fotografias -----------------------------------------------------------------------
caso('um ficheiro com um nome que o site não aceita: pára, e é do Renato', () => {
  const d = dados(); d.ficheirosFotos = [...d.ficheirosFotos, 'Foto 1'];
  const p = R.problemas(d, { hoje: '2026-10-07' }).find((x) => x.chave === 'fotos:Foto 1:nome-do-ficheiro');
  assert.ok(p && p.classe === 'bloqueia' && /Só o Renato/.test(p.mensagem), JSON.stringify(p));
  assert.ok(!R.problemas(d, { hoje: '2026-10-07' }).some((x) => x.chave === 'fotos:Foto 1:sem-entrada'));
});
caso('uma referência com espaços à volta conta como usada (nunca sai da biblioteca)', () => {
  const d = dados(); const a = JSON.parse(d.artigos['regua-de-crescimento']); a.fotos = [' regua-recorte ', 'regua-simao-carlota']; d.artigos['regua-de-crescimento'] = JSON.stringify(a);
  assert.ok(R.fotosEmUso(d).has('regua-recorte'));
});
caso('quem faz: texto como os outros (tamanho, sem «</script»)', () => {
  const s = JSON.parse(ler('content/site.json'));
  s.fundadores = 'x'.repeat(81);
  assert.ok(R.problemasDoSite(s).some((p) => p.chave === 'site:fundadores:tamanho'));
  s.fundadores = 'Sandro </script>';
  assert.ok(R.problemasDoSite(s).some((p) => p.chave === 'site:fundadores:parte' && p.classe === 'bloqueia'));
});

caso('página inicial: o nome de um separador é um texto curto; um desenho que não existe só avisa', () => {
  const h = JSON.parse(ler('content/inicio.json'));
  h.vitrine.separadores[1].nome = 'x'.repeat(61);
  assert.ok(R.problemasDoInicio(h).some((p) => p.chave === 'inicio:vitrine.separadores.1.nome:tamanho'));
  h.vitrine.separadores[1].nome = 'Mais vendidos'; h.vantagens[0].icone = 'estrela';
  const p = R.problemasDoInicio(h).find((x) => x.chave === 'inicio:vantagens.0.icone');
  assert.ok(p && p.classe === 'avisa' && !p.lembrete && /Só o Renato/.test(p.mensagem));
});

// --- neutralizar ---------------------------------------------------------------------------
caso('neutralizar esconde o artigo com problema e tira-o dos complementos', () => {
  const d = dados();
  const pr = JSON.parse(d.artigos['prancha-dupla-face']); delete pr.preco; d.artigos['prancha-dupla-face'] = JSON.stringify(pr);
  const n = R.neutralizar(d, R.problemas(d, { hoje: '2026-10-07' }));
  assert.equal(n.artigos['prancha-dupla-face'].publicado, false);
  assert.deepEqual(n.artigos['arco-pikler'].complementos, []);
  assert.ok(n.efeitos.some((e) => e.slug === 'prancha-dupla-face'));
});
caso('neutralizar não muda nada no conteúdo de hoje', () => {
  const d = dados();
  assert.equal(R.neutralizar(d, R.problemas(d, { hoje: '2026-10-07' })).mudou, false);
});

// --- o que o painel não muda ----------------------------------------------------------------
caso('site: a marca e as zonas não mudam; secções novas não entram', () => {
  const s = JSON.parse(ler('content/site.json'));
  const t = JSON.parse(ler('content/site.json')); t.marca = 'Outra'; t.entrega.zonas[1].nome = 'x'; t.novidade = 1;
  assert.deepEqual(R.mudancasBloqueadas(s, t, 'site').map((x) => x.caminho).sort(), ['entrega.zonas', 'marca', 'novidade']);
  const u = JSON.parse(ler('content/site.json')); u.contactos.email = 'outro@exemplo.pt'; u.aviso.texto = 'Novo';
  assert.deepEqual(R.mudancasBloqueadas(s, u, 'site'), []);
});
caso('artigo: uma chave que não é do formulário não muda', () => {
  const a = artigo('arco-pikler'); const b = { ...a, extra: 1 };
  assert.deepEqual(R.mudancasBloqueadas(a, b, 'artigo'), [{ caminho: 'extra', motivo: 'chave_nova' }]);
});
caso('categorias: os textos mudam, os endereços não', () => {
  const c = JSON.parse(ler('content/categorias.json'));
  const d = JSON.parse(ler('content/categorias.json')); d[0].nome = 'Torres'; d[0].foto = 'torre-mesa-cozinha';
  assert.deepEqual(R.mudancasBloqueadas(c, d, 'categorias'), []);
  d[1].slug = 'outra';
  assert.deepEqual(R.mudancasBloqueadas(c, d, 'categorias'), [{ caminho: '1.slug', motivo: 'mudou' }]);
});
caso('ordenarComo põe a chave nova no sítio do formulário', () => {
  const o = R.ordenarComo({ nome: 'x', preco: 1, publicado: true }, { nome: 'x', preco: 1, publicado: true, precoAnterior: 2 });
  assert.deepEqual(Object.keys(o), ['nome', 'preco', 'precoAnterior', 'publicado']);
});

for (const f of falhas) console.error(`✗ ${f}`);
console.log(`regras: ${certos} certas, ${falhas.length} falhas`);
process.exit(falhas.length ? 1 : 0);
