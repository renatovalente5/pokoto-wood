// A moldura de todas as páginas: <head>, aviso, cabeçalho, rodapé, gaveta do carrinho e menu.
import { esc, euros, numeroWhatsApp, precoDe } from './util.mjs';
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

const quantosArtigos = (n) => (n === 1 ? '1 artigo' : `${n} artigos`);

/* O MENU DO COMPUTADOR (a partir de 1180 px; abaixo, o botão do canto abre o do telemóvel). A
   arrumação do menu do telemóvel (opção 2, 12 out 2026): «Loja» abre um painel com as categorias e
   os artigos todos, com o preço; a seguir, a personalização grátis e as páginas de informação; à
   direita (cabecalho), o WhatsApp, por onde chegam as encomendas, e o carrinho. O painel abre com
   um clique e, com o rato, também ao parar em cima de «Loja» (site.js). A categoria aparece com o
   «Nome no menu» do painel, o nome curto. As miniaturas, aqui e no menu do telemóvel, vão sem texto
   alternativo: o nome está ao lado, e o leitor de ecrã lia a descrição da fotografia em cada linha. */
function navegacao(ctx, caminho) {
  const atual = (c) => (caminho === c ? ' aria-current="page"' : '');
  const naLoja = caminho.startsWith('/loja/') || caminho.startsWith('/produtos/');
  const precoNoMenu = (p) => {
    const v = precoDe(p, ctx.hoje);
    return v.anterior
      ? `<span class="nav__preco nav__preco--promocao"><b>${euros(v.atual)}</b> <s><span class="visualmente-escondido">em vez de </span>${euros(v.anterior)}</s></span>`
      : `<span class="nav__preco"><b>${euros(v.atual)}</b></span>`;
  };
  const colunas = ctx.categorias.map((c) => {
    const lista = ctx.produtos.filter((p) => p.categoria === c.slug);
    return `<li class="nav__coluna">
          <a class="nav__categoria" href="${ctx.url(`/loja/${c.slug}/`)}"${atual(`/loja/${c.slug}/`)}><span class="nav__mini">${imagem(ctx, c.foto, { tamanhos: '56px', alt: '' })}</span><span class="nav__cat"><span class="nav__cat-nome">${esc(c.nomeMenu || c.nome)}</span><span class="nav__conta">${quantosArtigos(lista.length)}</span></span></a>
          <ul>${lista.map((p) => `<li><a class="nav__artigo" href="${ctx.url(`/produtos/${p.slug}/`)}"${atual(`/produtos/${p.slug}/`)}><span>${esc(p.nome)}</span>${precoNoMenu(p)}</a></li>`).join('')}</ul>
        </li>`;
  }).join('\n        ');
  const pagina = (c, texto) => `<li class="nav__item"><a class="nav__ligacao" href="${ctx.url(c)}"${atual(c)}>${texto}</a></li>`;
  return `<nav class="nav" aria-label="Principal"><ul class="nav__lista">
    <li class="nav__item nav__item--loja">
      <button class="nav__loja" type="button" aria-expanded="false" aria-controls="nav-loja"${naLoja ? ' data-atual' : ''}>Loja${icones.baixo}</button>
      <div class="nav__painel" id="nav-loja">
        <ul class="nav__colunas">
        ${colunas}
        </ul>
        <div class="nav__pe">
          <a class="nav__tudo" href="${ctx.url('/loja/')}"${atual('/loja/')}>Ver toda a loja · ${quantosArtigos(ctx.produtos.length)} ${icones.seta}</a>
          <a class="nav__pz" href="${ctx.url('/personalizacao/')}">${icones.presente}<span><b>Personalização grátis</b> — o nome, uma frase ou um desenho</span>${icones.direita}</a>
        </div>
      </div>
    </li>
    <li class="nav__item"><a class="nav__ligacao nav__ligacao--pz" href="${ctx.url('/personalizacao/')}"${atual('/personalizacao/')}>${icones.presente}Personalização grátis</a></li>
    ${pagina('/sobre-nos/', 'Sobre nós')}
    ${pagina('/como-encomendar/', 'Como encomendar')}
    ${pagina('/contactos/', 'Contactos')}
  </ul></nav>`;
}

function cabecalho(ctx, caminho) {
  const c = ctx.site.contactos;
  return `<header class="topo">
  <div class="topo__barra">
    <button class="topo__menu" type="button" data-abrir="menu" aria-haspopup="dialog">${icones.menu}<span class="visualmente-escondido">Menu</span></button>
    <a class="topo__marca" href="${ctx.url('/')}">${logotipo(ctx)}<span class="visualmente-escondido"> — página inicial</span></a>
    ${navegacao(ctx, caminho)}
    ${c.whatsapp ? `<a class="topo__whatsapp" href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${icones.whatsapp}<span>Falar connosco<span class="visualmente-escondido"> no WhatsApp</span></span></a>` : ''}
    <a class="topo__carrinho" href="${ctx.url('/carrinho/')}" data-abrir="carrinho" aria-haspopup="dialog">${icones.carrinho}<span class="visualmente-escondido">Carrinho</span><span class="topo__conta" data-conta hidden></span></a>
  </div>
</header>`;
}

function redes(ctx, classe = 'redes', { whatsapp = true } = {}) {
  const c = ctx.site.contactos;
  const r = [];
  if (c.instagram) r.push(`<a href="https://www.instagram.com/${esc(c.instagram)}/" target="_blank" rel="noopener">${icones.instagram}<span class="visualmente-escondido">Instagram</span></a>`);
  if (c.facebook) r.push(`<a href="https://www.facebook.com/${esc(c.facebook)}" target="_blank" rel="noopener">${icones.facebook}<span class="visualmente-escondido">Facebook</span></a>`);
  if (c.whatsapp && whatsapp) r.push(`<a href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${icones.whatsapp}<span class="visualmente-escondido">WhatsApp</span></a>`);
  return `<ul class="${classe}">${r.map((x) => `<li>${x}</li>`).join('')}</ul>`;
}

function rodape(ctx) {
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
        <li><a href="${ctx.url('/opinioes/')}">Opiniões de clientes</a></li>
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
    <p>© ${ctx.hoje.slice(0, 4)} ${esc(ctx.site.marca)}</p>
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

/* O MENU DO TELEMÓVEL (a opção B, escolhida pelo Renato a 12 out 2026): uma coisa por linha.
   As categorias com a miniatura e quantos artigos têm; a personalização grátis num cartão (é o
   que distingue a Pokóto); as páginas de informação; e em baixo a acção principal, o WhatsApp,
   por onde chegam as encomendas. Tem de caber no ecrã sem rolar: as medidas seguem a altura que
   o telemóvel dá ao menu (site.css). */
function menuMovel(ctx) {
  const linha = (href, conteudo) => `<li><a class="menu__linha" href="${href}">${conteudo}${icones.direita}</a></li>`;
  const cats = ctx.categorias.map((c) => linha(ctx.url(`/loja/${c.slug}/`),
    `<span class="menu__mini">${imagem(ctx, c.foto, { tamanhos: '56px', alt: '' })}</span><span class="menu__texto"><span class="menu__nome">${esc(c.nome)}</span><span class="menu__conta">${quantosArtigos(ctx.produtos.filter((p) => p.categoria === c.slug).length)}</span></span>`)).join('');
  const c = ctx.site.contactos;
  const levantamento = (ctx.site.entrega?.zonas || []).some((z) => z.id === 'levantamento');
  return `<dialog class="menu" id="menu" aria-label="Menu">
  <div class="menu__corpo">
    <div class="menu__topo">
      <a href="${ctx.url('/')}">${logotipo(ctx, { alto: 52 })}</a>
      <button class="menu__fechar" type="button" data-fechar>${icones.fechar}<span class="visualmente-escondido">Fechar o menu</span></button>
    </div>
    <nav class="menu__nav" aria-label="Menu">
      <h2 class="menu__titulo" id="menu-loja">Loja</h2>
      <ul class="menu__lista" aria-labelledby="menu-loja">${cats}</ul>
      <a class="menu__tudo" href="${ctx.url('/loja/')}">Ver toda a loja · ${quantosArtigos(ctx.produtos.length)} ${icones.seta}</a>
      <a class="menu__pz" href="${ctx.url('/personalizacao/')}">${icones.presente}<span class="menu__pz-textos"><span class="menu__pz-titulo">Personalização grátis</span><span class="menu__pz-texto">O nome, uma frase ou um desenho</span></span>${icones.direita}</a>
      <ul class="menu__lista menu__lista--info">
        ${linha(ctx.url('/sobre-nos/'), '<span class="menu__nome">Sobre nós</span>')}
        ${linha(ctx.url('/como-encomendar/'), '<span class="menu__nome">Como encomendar</span>')}
        ${linha(ctx.url('/contactos/'), '<span class="menu__nome">Contactos</span>')}
      </ul>
    </nav>
    <div class="menu__pe">
      ${c.whatsapp ? `<a class="menu__whatsapp" href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${icones.whatsapp}<span>Falar connosco no WhatsApp</span></a>` : ''}
      <div class="menu__info">
        ${levantamento ? `<p>Levantamento grátis na oficina, em ${esc(ctx.site.local.localidade)}</p>` : ''}
        ${redes(ctx, 'redes redes--menu', { whatsapp: false })}
      </div>
    </div>
  </div>
</dialog>`;
}

export function pagina(ctx, { titulo, descricao, caminho, conteudo, partilha, tipo = 'website', jsonld = [], classe = '', indexar = true }) {
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
${!ctx.producao ? '<meta name="robots" content="noindex, nofollow">\n' : indexar === false ? '<meta name="robots" content="noindex">\n' : ''}<meta property="og:type" content="${tipo}">
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
