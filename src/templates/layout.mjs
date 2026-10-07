// A moldura de todas as páginas: <head>, aviso, cabeçalho, rodapé, gaveta do carrinho e menu.
import { esc, numeroWhatsApp } from './util.mjs';
import { icones } from './icones.mjs';
import { imagem } from './componentes.mjs';

const LIVRO = 'https://www.livroreclamacoes.pt/inicio';

function logotipo(ctx, { alto = 64, classe = 'logo' } = {}) {
  const l = ctx.manifesto.logo;
  const v = l.altura[alto * 2] || l.altura[128];
  const largo = Math.round((v.largura / (alto * 2)) * alto);
  return `<img class="${classe}" src="${ctx.asset(`img/${v.webp}`)}" width="${largo}" height="${alto}" alt="${esc(ctx.site.marca)}">`;
}

function aviso(ctx) {
  const a = ctx.site.aviso || {};
  if (!a.texto || (a.ate && ctx.hoje > a.ate)) return '';
  const texto = esc(a.texto);
  const corpo = a.ligacao ? `<a href="${ctx.url(a.ligacao)}">${texto}</a>` : texto;
  // data-ate: o site.js esconde o aviso no dia seguinte, mesmo que ninguém publique nada
  return `<div class="aviso"${a.ate ? ` data-ate="${esc(a.ate)}"` : ''}><p>${corpo}</p></div>`;
}

function navegacao(ctx, caminho) {
  const itens = ctx.categorias.map((c) => {
    const artigos = ctx.produtos.filter((p) => p.categoria === c.slug);
    const atual = caminho.startsWith(`/loja/${c.slug}/`) || artigos.some((p) => caminho === `/produtos/${p.slug}/`);
    const painel = artigos.length > 1
      ? `<button class="nav__abrir" type="button" aria-expanded="false" aria-controls="sub-${c.slug}"><span class="visualmente-escondido">Artigos de ${esc(c.nome)}</span>${icones.baixo}</button>
        <div class="nav__painel" id="sub-${c.slug}"><ul>${artigos.map((p) => `<li><a href="${ctx.url(`/produtos/${p.slug}/`)}">${esc(p.nome)}</a></li>`).join('')}<li class="nav__todos"><a href="${ctx.url(`/loja/${c.slug}/`)}">Ver ${esc(c.nome.toLowerCase())} ${icones.seta}</a></li></ul></div>`
      : '';
    return `<li class="nav__item${painel ? ' nav__item--painel' : ''}"><a class="nav__ligacao" href="${ctx.url(`/loja/${c.slug}/`)}"${atual ? ' aria-current="true"' : ''}>${esc(c.nomeMenu || c.nome)}</a>${painel}</li>`;
  });
  return `<nav class="nav" aria-label="Principal"><ul class="nav__lista">
    <li class="nav__item"><a class="nav__ligacao" href="${ctx.url('/loja/')}"${caminho === '/loja/' ? ' aria-current="page"' : ''}>Loja</a></li>
    ${itens.join('\n')}
    <li class="nav__item"><a class="nav__ligacao" href="${ctx.url('/sobre-nos/')}"${caminho === '/sobre-nos/' ? ' aria-current="page"' : ''}>Sobre nós</a></li>
    <li class="nav__item"><a class="nav__pilula" href="${ctx.url('/personalizacao/')}"${caminho === '/personalizacao/' ? ' aria-current="page"' : ''}>Personalização grátis</a></li>
  </ul></nav>`;
}

function cabecalho(ctx, caminho) {
  return `<header class="topo">
  <div class="topo__barra">
    <button class="topo__menu" type="button" data-abrir="menu" aria-haspopup="dialog">${icones.menu}<span class="visualmente-escondido">Menu</span></button>
    <a class="topo__marca" href="${ctx.url('/')}">${logotipo(ctx)}<span class="visualmente-escondido"> — página inicial</span></a>
    ${navegacao(ctx, caminho)}
    <a class="topo__carrinho" href="${ctx.url('/carrinho/')}" data-abrir="carrinho" aria-haspopup="dialog">${icones.carrinho}<span class="visualmente-escondido">Carrinho</span><span class="topo__conta" data-conta hidden></span></a>
  </div>
</header>`;
}

function redes(ctx, classe = 'redes') {
  const c = ctx.site.contactos;
  const r = [];
  if (c.instagram) r.push(`<a href="https://www.instagram.com/${esc(c.instagram)}/" target="_blank" rel="noopener">${icones.instagram}<span class="visualmente-escondido">Instagram</span></a>`);
  if (c.facebook) r.push(`<a href="https://www.facebook.com/${esc(c.facebook)}" target="_blank" rel="noopener">${icones.facebook}<span class="visualmente-escondido">Facebook</span></a>`);
  if (c.whatsapp) r.push(`<a href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${icones.whatsapp}<span class="visualmente-escondido">WhatsApp</span></a>`);
  return `<ul class="${classe}">${r.map((x) => `<li>${x}</li>`).join('')}</ul>`;
}

function rodape(ctx) {
  const e = ctx.site.empresa;
  const identificacao = [e.nome, e.nif ? `NIF ${e.nif}` : ''].filter(Boolean).join(' · ');
  return `<footer class="rodape">
  <div class="rodape__grelha">
    <div class="rodape__marca">
      <a href="${ctx.url('/')}">${logotipo(ctx, { alto: 96, classe: 'logo logo--rodape' })}</a>
      <p class="rodape__assinatura">${esc(ctx.site.assinatura)}</p>
      ${redes(ctx, 'redes redes--rodape')}
    </div>
    <div class="rodape__coluna">
      <h2>Loja</h2>
      <ul>
        <li><a href="${ctx.url('/loja/')}">Todos os artigos</a></li>
        ${ctx.categorias.map((c) => `<li><a href="${ctx.url(`/loja/${c.slug}/`)}">${esc(c.nome)}</a></li>`).join('')}
      </ul>
    </div>
    <div class="rodape__coluna">
      <h2>Ajuda</h2>
      <ul>
        <li><a href="${ctx.url('/como-encomendar/')}">Como encomendar</a></li>
        <li><a href="${ctx.url('/personalizacao/')}">Personalização</a></li>
        <li><a href="${ctx.url('/perguntas-frequentes/')}">Perguntas frequentes</a></li>
        <li><a href="${ctx.url('/sobre-nos/')}">Sobre nós</a></li>
        <li><a href="${ctx.url('/contactos/')}">Contactos</a></li>
      </ul>
    </div>
    <div class="rodape__coluna">
      <h2>Informação legal</h2>
      <ul>
        <li><a href="${ctx.url('/termos-e-condicoes/')}">Termos e condições</a></li>
        <li><a href="${ctx.url('/politica-de-privacidade/')}">Política de privacidade</a></li>
        <li><a href="${ctx.url('/politica-de-cookies/')}">Política de cookies</a></li>
        <li><a href="${ctx.url('/garantia/')}">Garantia legal</a></li>
        <li><a href="${ctx.url('/desistir/')}">Desistir de uma compra</a></li>
        <li><a href="${ctx.url('/resolucao-de-litigios/')}">Resolução de litígios</a></li>
        <li><a href="${LIVRO}" target="_blank" rel="noopener">Livro de Reclamações</a></li>
      </ul>
    </div>
  </div>
  <div class="rodape__fim">
    <p>© ${ctx.hoje.slice(0, 4)} ${esc(ctx.site.marca)}${identificacao ? ` · ${esc(identificacao)}` : ''}</p>
    <p>Feito em ${esc(ctx.site.local.localidade)}, Portugal</p>
  </div>
</footer>`;
}

function gavetaCarrinho(ctx) {
  return `<dialog class="gaveta" id="carrinho" aria-labelledby="carrinho-titulo">
  <div class="gaveta__corpo">
    <div class="gaveta__topo">
      <h2 id="carrinho-titulo">O seu carrinho</h2>
      <button class="gaveta__fechar" type="button" data-fechar>${icones.fechar}<span class="visualmente-escondido">Fechar o carrinho</span></button>
    </div>
    <div class="gaveta__conteudo" data-carrinho-gaveta>
      <p class="gaveta__vazio">O carrinho está vazio.</p>
    </div>
  </div>
</dialog>`;
}

function menuMovel(ctx) {
  const cats = ctx.categorias.map((c) => `<li><a class="menu__cat" href="${ctx.url(`/loja/${c.slug}/`)}">${imagem(ctx, c.foto, { tamanhos: '45vw', classe: 'menu__cat-foto' })}<span>${esc(c.nome)}</span></a></li>`).join('');
  return `<dialog class="menu" id="menu" aria-label="Menu">
  <div class="menu__corpo">
    <div class="menu__topo">
      <a href="${ctx.url('/')}">${logotipo(ctx, { alto: 56 })}</a>
      <button class="menu__fechar" type="button" data-fechar>${icones.fechar}<span class="visualmente-escondido">Fechar o menu</span></button>
    </div>
    <nav class="menu__nav" aria-label="Menu">
      <a class="menu__loja" href="${ctx.url('/loja/')}">Ver toda a loja ${icones.seta}</a>
      <ul class="menu__cats">${cats}</ul>
      <ul class="menu__ligacoes">
        <li><a href="${ctx.url('/personalizacao/')}">Personalização grátis</a></li>
        <li><a href="${ctx.url('/sobre-nos/')}">Sobre nós</a></li>
        <li><a href="${ctx.url('/como-encomendar/')}">Como encomendar</a></li>
        <li><a href="${ctx.url('/contactos/')}">Contactos</a></li>
      </ul>
    </nav>
    ${redes(ctx, 'redes redes--menu')}
  </div>
</dialog>`;
}

export function pagina(ctx, { titulo, descricao, caminho, conteudo, partilha, tipo = 'website', jsonld = [], classe = '' }) {
  const tituloCompleto = titulo.includes(ctx.site.marca) ? titulo : `${titulo} | ${ctx.site.marca}`;
  const cartao = partilha || ctx.manifesto.partilha._site;
  const l = ctx.manifesto.logo;
  const imgAbs = ctx.absoluto(`/assets/img/${cartao}`);
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${ctx.absoluto(caminho)}">
${ctx.producao ? '' : '<meta name="robots" content="noindex, nofollow">\n'}<meta property="og:type" content="${tipo}">
<meta property="og:site_name" content="${esc(ctx.site.marca)}">
<meta property="og:locale" content="pt_PT">
<meta property="og:title" content="${esc(tituloCompleto)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${ctx.absoluto(caminho)}">
<meta property="og:image" content="${imgAbs}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ctx.site.marca)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F6EEE3">
<link rel="icon" type="image/png" sizes="32x32" href="${ctx.asset(`img/${l.icones[32]}`)}">
<link rel="icon" type="image/png" sizes="48x48" href="${ctx.asset(`img/${l.icones[48]}`)}">
<link rel="apple-touch-icon" href="${ctx.asset(`img/${l.icones.apple}`)}">
<link rel="preload" href="${ctx.asset('fontes/grandstander-400-700.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${ctx.asset('fontes/ubuntu-400.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset(ctx.ficheiros.css)}">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
<script src="${ctx.asset(ctx.ficheiros.js)}" defer></script>
</head>
<body class="${esc(classe)}" data-catalogo="${ctx.asset(ctx.ficheiros.catalogo)}" data-base="${ctx.url('/')}">
<a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
${aviso(ctx)}
${cabecalho(ctx, caminho)}
<main id="conteudo" tabindex="-1">
${conteudo}
</main>
${rodape(ctx)}
${gavetaCarrinho(ctx)}
${menuMovel(ctx)}
</body>
</html>
`;
}
