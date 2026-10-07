#!/usr/bin/env node
// Gera o site da Pokóto Wood em _site/, a partir de content/ e media/. Node 22, sem dependências.
//
//   node scripts/build.mjs                       local, em http://localhost:4810/
//   node scripts/build.mjs --base=/pokoto-wood   pré-visualização no GitHub Pages
//   node scripts/build.mjs --producao            o domínio final: abre aos motores de busca,
//                                                escreve o CNAME e RECUSA publicar com dados
//                                                legais por preencher
//   node scripts/build.mjs --sem-imagens         não corre o scripts/imagens.py (usa a cache)
//
// Os textos que a lei manda ter certos (identificação, NIF, morada, contactos, prazos) vêm todos
// de content/site.json por marcadores ({{email}}, {{empresa.identificacao}}…): nunca escritos à
// mão nas páginas, para não envelhecerem num sítio e ficarem certos noutro.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { esc, euros, hojeEmLisboa, markdown, numeroWhatsApp, numeroLegivel, custoChamada, precoDe, moradaCompleta } from '../src/templates/util.mjs';
import { pagina } from '../src/templates/layout.mjs';
import * as paginas from '../src/templates/paginas.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, '_site');
const args = process.argv.slice(2);
const producao = args.includes('--producao');
const base = producao ? '' : (args.find((a) => a.startsWith('--base='))?.slice(7) || '').replace(/\/$/, '');
const semImagens = args.includes('--sem-imagens');

// O domínio final ainda não está comprado (7 out 2026): pokotowood.pt está livre. Mudar aqui
// quando estiver, e o CNAME, o canonical e o sitemap seguem.
const DOMINIO = 'pokotowood.pt';
const ORIGEM = producao ? `https://${DOMINIO}` : (base ? 'https://renatovalente5.github.io' : 'http://localhost:4810');

const erros = [];
const avisos = [];
const ler = (rel) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));

// ---------------------------------------------------------------- conteúdo
const site = ler('content/site.json');
const inicio = ler('content/inicio.json');
const categorias = ler('content/categorias.json');
const fotos = ler('content/fotos.json');
const todosProdutos = fs.readdirSync(path.join(RAIZ, 'content/produtos'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ slug: f.replace(/\.json$/, ''), ...ler(`content/produtos/${f}`) }));
const produtos = todosProdutos.filter((p) => p.publicado !== false).sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.nome.localeCompare(b.nome, 'pt'));
const hoje = hojeEmLisboa();

// ---------------------------------------------------------------- guardas
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const ZONAS = site.entrega.zonas.map((z) => z.id);
const ZONAS_ENVIO = site.entrega.zonas.filter((z) => z.morada).map((z) => z.id);
const fotoExiste = (f) => fotos[f] && fs.existsSync(path.join(RAIZ, 'media/fotos', `${f}.jpg`));

function nifValido(nif) {
  const d = String(nif).replace(/\D/g, '');
  if (!/^[123456789]\d{8}$/.test(d)) return false;
  const soma = [...d.slice(0, 8)].reduce((s, c, i) => s + Number(c) * (9 - i), 0);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(d[8]);
}

if (!site.marca) erros.push('content/site.json: falta a marca');
if (site.contactos.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(site.contactos.email)) erros.push('Os seus dados › Email: o endereço não parece válido');
if (site.contactos.whatsapp && !/^\d{11,15}$/.test(numeroWhatsApp(site.contactos.whatsapp))) erros.push('Os seus dados › WhatsApp: o número não parece válido (ex.: 912 345 678)');
if (site.empresa.nif && !nifValido(site.empresa.nif)) erros.push('Os seus dados › NIF: o número não é um NIF português válido');
if (site.aviso?.ate && !DATA.test(site.aviso.ate)) erros.push('Aviso do topo › «até»: a data tem de ser AAAA-MM-DD');
if (!ZONAS.includes('levantamento') || ZONAS_ENVIO.length === 0) erros.push('content/site.json › entrega.zonas: faltam zonas de entrega');

const slugsCat = new Set();
for (const c of categorias) {
  if (!/^[a-z0-9-]+$/.test(c.slug || '')) erros.push(`Categorias: «${c.nome}» tem um endereço inválido`);
  if (slugsCat.has(c.slug)) erros.push(`Categorias: «${c.slug}» repetida`);
  slugsCat.add(c.slug);
  if (!fotoExiste(c.foto)) erros.push(`Categorias › ${c.nome}: a fotografia «${c.foto}» não existe`);
}

for (const p of todosProdutos) {
  const onde = `Artigos › ${p.nome || p.slug}`;
  if (!/^[a-z0-9-]+$/.test(p.slug)) erros.push(`${onde}: o nome do ficheiro tem de ser só letras minúsculas, algarismos e hífenes`);
  if (!p.nome) erros.push(`${onde}: falta o nome`);
  if (!slugsCat.has(p.categoria)) erros.push(`${onde}: a categoria «${p.categoria}» não existe`);
  if (!(Number(p.preco) > 0)) erros.push(`${onde}: falta o preço`);
  if (p.precoAnterior != null && p.precoAnterior !== '' && !(Number(p.precoAnterior) > Number(p.preco))) erros.push(`${onde}: o preço anterior tem de ser maior do que o preço (ou ficar vazio)`);
  if (p.promocaoAte && !DATA.test(p.promocaoAte)) erros.push(`${onde}: a data do fim da promoção tem de ser AAAA-MM-DD`);
  if (p.promocaoAte && !p.precoAnterior) erros.push(`${onde}: tem data de fim de promoção mas não tem preço anterior`);
  if (!p.fotos?.length) erros.push(`${onde}: precisa de pelo menos uma fotografia`);
  for (const f of p.fotos || []) if (!fotoExiste(f)) erros.push(`${onde}: a fotografia «${f}» não existe`);
  if (p.video && !existe(`media/video/${p.video}.mp4`)) erros.push(`${onde}: o vídeo «${p.video}» não existe`);
  if (p.vendaIsolada !== false) {
    if (!p.envio) erros.push(`${onde}: faltam os portes de envio`);
    else for (const z of ZONAS_ENVIO) {
      const v = p.envio[z];
      if (v !== null && v !== undefined && !(Number.isFinite(v) && v >= 0)) erros.push(`${onde}: os portes para «${z}» têm de ser um número (ou ficar vazios = a confirmar)`);
      if (v === null || v === undefined) avisos.push(`${onde}: portes para «${z}» por preencher (o carrinho diz «a confirmar»)`);
    }
  }
  for (const k of p.complementos || []) {
    const alvo = todosProdutos.find((x) => x.slug === k.produto);
    if (!alvo) erros.push(`${onde}: o complemento «${k.produto}» não existe`);
    else if (alvo.publicado === false) avisos.push(`${onde}: o complemento «${alvo.nome}» está escondido e não aparece`);
  }
}
for (const p of produtos.filter((x) => x.vendaIsolada === false)) {
  if (!produtos.some((x) => (x.complementos || []).some((k) => k.produto === p.slug))) erros.push(`Artigos › ${p.nome}: só se vende como complemento, mas nenhum artigo publicado o tem como complemento`);
}

const refsInicio = [inicio.capa.foto, inicio.personalizacao.foto, ...inicio.emCasa.fotos.map((f) => f.foto), ...inicio.instagram.fotos];
for (const f of refsInicio) if (!fotoExiste(f)) erros.push(`Página inicial: a fotografia «${f}» não existe`);
for (const f of inicio.emCasa.fotos) if (!produtos.some((p) => p.slug === f.produto)) erros.push(`Página inicial › Em casa: o artigo «${f.produto}» não existe ou está escondido`);
if (inicio.oficina.video && !existe(`media/video/${inicio.oficina.video}.mp4`)) erros.push(`Página inicial › Oficina: o vídeo «${inicio.oficina.video}» não existe`);

// Alegações ambientais genéricas: proibidas desde 27 set 2026 sem prova (Diretiva (UE) 2024/825).
// E nada de certificações que a Pokóto não nos mostrou (CE, EN 71, FSC).
const PROIBIDAS = /\b(ecol[óo]gic[oa]s?|sustent[áa]ve(l|is)|sustentabilidade|amig[oa]s? do ambiente|eco-?friendly|biodegrad[áa]ve(l|is)|neutr[oa]s? em carbono|certificad[oa]s?|FSC|EN ?71|marca[çc][ãa]o CE)\b/i;
const textosLivres = [
  ['content/site.json', JSON.stringify(site)],
  ['content/inicio.json', JSON.stringify(inicio)],
  ['content/categorias.json', JSON.stringify(categorias)],
  ...todosProdutos.map((p) => [`Artigos › ${p.nome}`, JSON.stringify(p)]),
  ...fs.readdirSync(path.join(RAIZ, 'content/paginas')).map((f) => [`Páginas › ${f}`, fs.readFileSync(path.join(RAIZ, 'content/paginas', f), 'utf8')]),
];
for (const [onde, t] of textosLivres) {
  const m = t.match(PROIBIDAS);
  if (m) erros.push(`${onde}: «${m[0]}» é uma alegação que a lei só deixa fazer com prova (ou uma certificação que não temos). Tire a palavra.`);
}

// Avisos legais do VIVO: em produção estes campos são obrigatórios (DL 7/2004 art. 10.º; DL 24/2014 art. 4.º).
const OBRIGATORIOS = [
  ['empresa.nome', site.empresa.nome, 'o nome da empresa (ou do empresário em nome individual)'],
  ['empresa.nif', site.empresa.nif, 'o NIF'],
  ['empresa.morada', site.empresa.morada, 'a morada da sede'],
  ['empresa.codigoPostal', site.empresa.codigoPostal, 'o código postal da sede'],
  ['empresa.iva', site.empresa.iva, 'a menção ao IVA (incluído ou isento ao abrigo do art. 53.º)'],
  ['contactos.whatsapp', site.contactos.whatsapp, 'o número de WhatsApp das encomendas'],
  ['entrega.prazo', site.entrega.prazo, 'o prazo de produção e entrega'],
  ['entrega.pagamento', site.entrega.pagamento, 'as formas de pagamento'],
];
for (const [campo, valor, desc] of OBRIGATORIOS) {
  if (!String(valor || '').trim()) (producao ? erros : avisos).push(`Os seus dados › ${campo}: falta ${desc}`);
}

if (erros.length) {
  console.error(`\nA publicação parou: ${erros.length} ${erros.length === 1 ? 'problema' : 'problemas'} no conteúdo.\n`);
  for (const e of erros) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// ---------------------------------------------------------------- imagens
if (!semImagens) execFileSync('python3', [path.join(RAIZ, 'scripts/imagens.py')], { stdio: 'inherit' });
const manifesto = JSON.parse(fs.readFileSync(path.join(RAIZ, '.cache/imagens/manifesto.json'), 'utf8'));
for (const f of Object.keys(fotos)) if (!manifesto.fotos[f]) { console.error(`Falta correr scripts/imagens.py para «${f}»`); process.exit(1); }

// ---------------------------------------------------------------- saída
fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, 'assets/img'), { recursive: true });
const copiar = (de, para) => { fs.mkdirSync(path.dirname(para), { recursive: true }); fs.copyFileSync(de, para); };
const resumo = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

for (const f of fs.readdirSync(path.join(RAIZ, '.cache/imagens'))) {
  if (f !== 'manifesto.json') copiar(path.join(RAIZ, '.cache/imagens', f), path.join(SAIDA, 'assets/img', f));
}
for (const f of fs.readdirSync(path.join(RAIZ, 'src/fontes'))) copiar(path.join(RAIZ, 'src/fontes', f), path.join(SAIDA, 'assets/fontes', f));

// o aviso oficial da garantia: byte a byte o da Comissão (media/legal/LEIA.md)
const AVISO_SHA = {
  'aviso-garantia-legal-pt.svg': '9069bb0bc5e9f3cf655579038be5646181cc5447a25f3f8ccf2d018eacba0ac1',
  'aviso-garantia-legal-pt.pdf': 'b145a3014984f474d9bb81c60b5a492a376e64e55695eb089f0554adaa752877',
};
for (const [f, sha] of Object.entries(AVISO_SHA)) {
  const buf = fs.readFileSync(path.join(RAIZ, 'media/legal', f));
  if (crypto.createHash('sha256').update(buf).digest('hex') !== sha) { console.error(`media/legal/${f} foi alterado: o aviso da garantia não se pode editar`); process.exit(1); }
  copiar(path.join(RAIZ, 'media/legal', f), path.join(SAIDA, 'assets/legal', f));
}
const AVISO_ALT = 'GARANTIA LEGAL. Proteção da garantia legal mínima de dois anos para os bens vendidos na União Europeia. Os consumidores podem invocar os seus direitos ao abrigo da garantia legal de conformidade, por exemplo, se os bens: não corresponderem à descrição; não funcionarem como previsto. Os vendedores são responsáveis por qualquer falta de conformidade que exista no momento em que os bens forem entregues e se manifeste no período de garantia legal. Os vendedores nessa situação estão obrigados a oferecer: reparação gratuita ou substituição gratuita; em alguns casos, redução do preço ou reembolso integral. Alguns países têm um período de garantia legal mais longo. Para os bens em segunda mão, pode aplicar-se um período mais curto, mas não inferior a um ano. Para mais informações sobre os seus direitos num determinado país, digitalize o código QR abaixo ou consulte o vendedor. europa.eu/youreurope/garantias. O que fazer se receber bens não conformes: 1. Contactar o vendedor o mais rapidamente possível para expor o problema; 2. Apresentar uma prova de compra, como um recibo, uma fatura ou um extrato bancário. Os vendedores e os produtores também podem oferecer garantias comerciais, que se aplicam independentemente da garantia legal. Por exemplo, pode ver este rótulo GARAN, que representa uma garantia comercial de durabilidade oferecida pelo produtor sem custos adicionais e cobrindo a totalidade do bem.';

// vídeos: nome com resumo, para a cache de um ano nunca servir um vídeo antigo
const ficheirosVideo = {};
for (const f of fs.readdirSync(path.join(RAIZ, 'media/video')).filter((x) => x.endsWith('.mp4'))) {
  const buf = fs.readFileSync(path.join(RAIZ, 'media/video', f));
  const nome = f.replace(/\.mp4$/, '');
  ficheirosVideo[nome] = `video/${nome}-${resumo(buf)}.mp4`;
  copiar(path.join(RAIZ, 'media/video', f), path.join(SAIDA, 'assets', ficheirosVideo[nome]));
}

// CSS e JS: um ficheiro cada, com o resumo no nome
const css = fs.readFileSync(path.join(RAIZ, 'src/estilos/site.css'));
const js = Buffer.from(['site.js', 'carrinho.js'].map((f) => `// ${f}\n${fs.readFileSync(path.join(RAIZ, 'src/scripts', f), 'utf8')}`).join('\n'));
const ficheiros = { css: `site-${resumo(css)}.css`, js: `site-${resumo(js)}.js`, videos: ficheirosVideo };
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.css), css);
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.js), js);

// ---------------------------------------------------------------- contexto dos modelos
const numero = numeroWhatsApp(site.contactos.whatsapp);
const ctx = {
  site, inicio, categorias, produtos, fotos, manifesto, hoje, producao, ficheiros,
  videos: { 'oficina-torres': 'várias torres de aprendizagem personalizadas na nossa oficina', 'trio-pikler': 'o triângulo, a prancha e o arco de Pikler montados juntos' },
  url: (c) => (/^https?:|^mailto:|^tel:|^#/.test(c) ? c : `${base}${c}`),
  asset: (rel) => `${base}/assets/${rel}`,
  absoluto: (c) => `${ORIGEM}${base}${c}`,
  // sem número ainda: o wa.me sem número abre o WhatsApp a pedir o contacto (dá para ensaiar)
  whatsapp: (texto) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`,
  numeroLegivel, custoChamada,
  marcador: (desc) => `<mark class="por-confirmar">[por confirmar: ${esc(desc)}]</mark>`,
};

// ---------------------------------------------------------------- catálogo do carrinho
const fotoPequena = (f) => { const m = manifesto.fotos[f]; const w = m.larguras.find((x) => x >= 360) || m.larguras[0]; return ctx.asset(`img/${f}-${m.resumo}-${w}.webp`); };
const catalogo = {
  v: 1,
  marca: site.marca,
  whatsapp: numero,
  zonas: site.entrega.zonas,
  notaVarios: site.entrega.notaVariosArtigos,
  carrinho: ctx.url('/carrinho/'),
  produtos: Object.fromEntries(produtos.map((p) => [p.slug, {
    nome: p.nome, nomeCurto: p.nomeCurto || p.nome, url: ctx.url(`/produtos/${p.slug}/`), foto: fotoPequena(p.fotos[0]),
    preco: p.preco, precoAnterior: p.precoAnterior || null, promocaoAte: p.promocaoAte || '',
    envio: p.envio || null, complementos: p.complementos || [], personalizacao: p.personalizacao || { disponivel: false },
    vendaIsolada: p.vendaIsolada !== false,
  }])),
};
const catalogoBuf = Buffer.from(JSON.stringify(catalogo));
ficheiros.catalogo = `catalogo-${resumo(catalogoBuf)}.json`;
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.catalogo), catalogoBuf);

// ---------------------------------------------------------------- marcadores das páginas de texto
function tabelaPortes() {
  const zonas = site.entrega.zonas.filter((z) => z.morada);
  const linhas = [];
  for (const p of produtos) {
    if (p.vendaIsolada === false) continue;
    const celula = (v) => (Number.isFinite(v) ? euros(v) : 'a confirmar');
    linhas.push(`<tr><th scope="row"><a href="${ctx.url(`/produtos/${p.slug}/`)}">${esc(p.nome)}</a></th>${zonas.map((z) => `<td>${celula(p.envio?.[z.id])}</td>`).join('')}</tr>`);
    for (const k of p.complementos || []) {
      const c = produtos.find((x) => x.slug === k.produto);
      if (!c) continue;
      linhas.push(`<tr class="quadro__sub"><th scope="row">${esc(p.nomeCurto || p.nome)} + ${esc((c.nomeCurto || c.nome).toLowerCase())}</th>${zonas.map((z) => `<td>${Number.isFinite(p.envio?.[z.id]) && Number.isFinite(k.envioExtra?.[z.id]) ? euros(p.envio[z.id] + k.envioExtra[z.id]) : 'a confirmar'}</td>`).join('')}</tr>`);
    }
  }
  return `<div class="quadro"><table><thead><tr><th scope="col">Artigo</th>${zonas.map((z) => `<th scope="col">${esc(z.curto)}</th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table></div><p class="nota">O levantamento na nossa oficina, em ${esc(site.local.localidade)}, não tem custos.</p>`;
}

function identificacao() {
  const e = site.empresa;
  const partes = [];
  partes.push(e.nome ? `<strong>${esc(e.nome)}</strong>` : ctx.marcador('o nome da empresa ou do empresário'));
  if (e.tipo) partes.push(esc(e.tipo));
  partes.push(e.nif ? `NIF ${esc(e.nif)}` : `NIF ${ctx.marcador('o NIF')}`);
  const morada = e.morada ? moradaCompleta(e) : '';
  partes.push(morada ? `com sede em ${esc(morada)}` : `com sede em ${ctx.marcador('a morada da sede')}`);
  return `${partes.join(', ')}, que vende com a marca ${esc(site.marca)}.`;
}

function botoesDesistencia() {
  const texto = `Olá! Quero desistir da compra (direito de livre resolução).\n\nArtigo: \nEncomendado em: \nRecebido em: \nNome: \nMorada: `;
  const b = [];
  if (numero) b.push(`<a class="botao botao--whatsapp" href="${ctx.whatsapp(texto)}">Desistir pelo WhatsApp</a>`);
  if (site.contactos.email) b.push(`<a class="botao botao--contorno" href="mailto:${esc(site.contactos.email)}?subject=${encodeURIComponent('Desistência da compra (livre resolução)')}&amp;body=${encodeURIComponent(texto)}">Desistir por email</a>`);
  return `<div class="botoes">${b.join('')}</div><p class="nota">Respondemos a confirmar que recebemos a sua desistência.</p>`;
}

function resolverMarcadores(fonte, onde) {
  const c = site.contactos;
  const tokens = [];
  const guardar = (html) => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  const valores = {
    marca: () => esc(site.marca),
    localidade: () => esc(site.local.localidade),
    email: () => (c.email ? guardar(`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`) : guardar(ctx.marcador('o email'))),
    whatsapp: () => (c.whatsapp ? guardar(`WhatsApp <a href="https://wa.me/${numero}">${esc(numeroLegivel(c.whatsapp))}</a> (${esc(custoChamada(c.whatsapp))})`) : guardar(`WhatsApp ${ctx.marcador('o número')}`)),
    'empresa.identificacao': () => guardar(identificacao()),
    'empresa.iva': () => (site.empresa.iva ? esc(site.empresa.iva) : guardar(ctx.marcador('IVA incluído à taxa legal, ou «isento de IVA ao abrigo do art. 53.º do CIVA»'))),
    prazo: () => (site.entrega.prazo ? esc(site.entrega.prazo) : guardar(ctx.marcador('quanto tempo leva a fazer e a entregar uma peça'))),
    pagamento: () => (site.entrega.pagamento ? esc(site.entrega.pagamento) : guardar(ctx.marcador('as formas de pagamento (MB WAY, transferência, no levantamento…)'))),
    levantamento: () => esc(site.entrega.levantamento || ''),
    notaVariosArtigos: () => esc(site.entrega.notaVariosArtigos || ''),
    tabelaPortes: () => guardar(tabelaPortes()),
    botoesDesistencia: () => guardar(botoesDesistencia()),
    avisoGarantia: () => guardar(`<figure class="aviso-garantia"><img src="${ctx.asset('legal/aviso-garantia-legal-pt.svg')}" width="600" height="848" alt="${esc(AVISO_ALT)}" loading="lazy"><figcaption><a href="${ctx.asset('legal/aviso-garantia-legal-pt.pdf')}">Descarregar o aviso oficial (PDF)</a> · <a href="https://europa.eu/youreurope/garantias" target="_blank" rel="noopener">europa.eu/youreurope/garantias</a></figcaption></figure>`),
  };
  const texto = fonte.replace(/\{\{([\w.]+)\}\}/g, (todo, chave) => {
    if (!valores[chave]) { erros.push(`${onde}: o marcador «${todo}» não existe (existem: ${Object.keys(valores).join(', ')})`); return todo; }
    return valores[chave]();
  });
  return { texto, tokens };
}

function paginaMarkdown(ficheiro) {
  const fonte = fs.readFileSync(path.join(RAIZ, 'content/paginas', ficheiro), 'utf8');
  const [cabeca, ...corpo] = fonte.split(/\n---\n/);
  const meta = Object.fromEntries(cabeca.split('\n').filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  const { texto, tokens } = resolverMarcadores(corpo.join('\n---\n'), `Páginas › ${ficheiro}`);
  // um marcador sozinho num parágrafo (quadro, figura, botões) sai do <p> que o Markdown lhe põe
  let html = markdown(texto, ctx.url).replace(/<p>\u0000(\d+)\u0000<\/p>/g, (_, i) => tokens[Number(i)]);
  html = html.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
  const slug = ficheiro.replace(/\.md$/, '');
  if (meta.foto && !fotoExiste(meta.foto)) erros.push(`Páginas › ${ficheiro}: a fotografia «${meta.foto}» não existe`);
  return { caminho: `/${slug}/`, titulo: meta.titulo, tituloSeo: meta.tituloSeo, descricao: meta.descricao, atualizado: meta.atualizado, foto: meta.foto, html };
}

// ---------------------------------------------------------------- páginas
const saidas = [];
saidas.push(paginas.inicio(ctx));
saidas.push(paginas.loja(ctx));
for (const c of categorias) saidas.push(paginas.loja(ctx, c.slug));
for (const p of produtos) saidas.push(paginas.produto(ctx, p));
saidas.push(paginas.carrinho(ctx));
saidas.push(paginas.contactos(ctx));
for (const f of fs.readdirSync(path.join(RAIZ, 'content/paginas')).filter((x) => x.endsWith('.md'))) saidas.push(paginas.texto(ctx, paginaMarkdown(f)));
saidas.push(paginas.erro404(ctx));

if (erros.length) {
  console.error(`\nA publicação parou: ${erros.length} problemas.\n`);
  for (const e of erros) console.error(`  ✗ ${e}`);
  process.exit(1);
}

for (const s of saidas) {
  const html = pagina(ctx, s);
  const destino = s.caminho.endsWith('.html') ? path.join(SAIDA, s.caminho) : path.join(SAIDA, s.caminho, 'index.html');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html);
}

// ---------------------------------------------------------------- robots, sitemap, CNAME
const indexaveis = saidas.filter((s) => !['/404.html', '/carrinho/'].includes(s.caminho));
let lastmod = {};
try {
  // a data da última alteração de cada página sai do git (o conteúdo de que ela é feita)
  const data = (ficheirosFonte) => execFileSync('git', ['log', '-1', '--format=%cs', '--', ...ficheirosFonte], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  for (const s of indexaveis) {
    let fontes = ['content/site.json'];
    if (s.caminho === '/') fontes = ['content/inicio.json', 'content/produtos'];
    else if (s.caminho.startsWith('/produtos/')) fontes = [`content/produtos/${s.caminho.split('/')[2]}.json`];
    else if (s.caminho.startsWith('/loja/')) fontes = ['content/produtos', 'content/categorias.json'];
    else if (existe(`content/paginas${s.caminho.replace(/\/$/, '')}.md`)) fontes = [`content/paginas${s.caminho.replace(/\/$/, '')}.md`];
    lastmod[s.caminho] = data(fontes) || hoje;
  }
} catch { lastmod = {}; }
fs.writeFileSync(path.join(SAIDA, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexaveis.map((s) => `  <url><loc>${ctx.absoluto(s.caminho)}</loc><lastmod>${lastmod[s.caminho] || hoje}</lastmod></url>`).join('\n')}
</urlset>
`);
// Pré-visualização: fechada aos motores de busca, mas aberta aos robôs que fazem a pré-visualização
// das ligações no WhatsApp e no Facebook (sem isto, partilhar o link mostra-se sem imagem).
fs.writeFileSync(path.join(SAIDA, 'robots.txt'), producao
  ? `User-agent: *\nAllow: /\n\nSitemap: ${ctx.absoluto('/sitemap.xml')}\n`
  : 'User-agent: facebookexternalhit\nAllow: /\n\nUser-agent: WhatsApp\nAllow: /\n\nUser-agent: *\nDisallow: /\n');
if (producao) fs.writeFileSync(path.join(SAIDA, 'CNAME'), `${DOMINIO}\n`);
fs.writeFileSync(path.join(SAIDA, '.nojekyll'), '');

// ---------------------------------------------------------------- verificação do que saiu
const problemas = [];
const todosHtml = [];
(function andar(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) andar(p); else if (f.endsWith('.html')) todosHtml.push(p); } })(SAIDA);
for (const f of todosHtml) {
  const html = fs.readFileSync(f, 'utf8');
  const onde = path.relative(SAIDA, f);
  for (const lixo of ['{{', 'undefined', 'NaN', '[object Object]']) if (html.includes(lixo)) problemas.push(`${onde}: contém «${lixo}»`);
  if (producao && html.includes('por-confirmar')) problemas.push(`${onde}: ainda tem texto por confirmar`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) problemas.push(`${onde}: imagem sem alt: ${m[0].slice(0, 80)}`);
  for (const m of html.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)) {
    let u = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|tel:|#|data:)/.test(u)) continue;
    if (base && !u.startsWith(base + '/')) { problemas.push(`${onde}: ligação sem o prefixo ${base}: ${u}`); continue; }
    u = u.slice(base.length).split(/[?#]/)[0];
    const alvo = path.join(SAIDA, decodeURIComponent(u));
    const ok = fs.existsSync(alvo) && (fs.statSync(alvo).isFile() || fs.existsSync(path.join(alvo, 'index.html')));
    if (!ok) problemas.push(`${onde}: ligação partida: ${m[1]}`);
  }
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const parte of m[1].split(',')) {
      const u = parte.trim().split(/\s+/)[0].slice(base.length);
      if (!fs.existsSync(path.join(SAIDA, u))) problemas.push(`${onde}: imagem em falta no srcset: ${u}`);
    }
  }
  const og = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  if (og && !fs.existsSync(path.join(SAIDA, og.replace(ORIGEM + base, '')))) problemas.push(`${onde}: o cartão de partilha não existe: ${og}`);
}
if (problemas.length) {
  console.error(`\nO site saiu com ${problemas.length} problemas:\n`);
  for (const p of [...new Set(problemas)].slice(0, 60)) console.error(`  ✗ ${p}`);
  process.exit(1);
}

for (const a of avisos) console.warn(`  ! ${a}`);
console.log(`site: ${saidas.length} páginas em _site/ (${producao ? `produção, ${DOMINIO}` : base ? `pré-visualização, ${ORIGEM}${base}/` : 'local'}), ${produtos.length} artigos, hoje ${hoje}`);
