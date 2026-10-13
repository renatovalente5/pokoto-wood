// As páginas do site. Cada função devolve { caminho, titulo, descricao, conteudo, ... } e o
// build.mjs veste-a com a moldura (layout.mjs).
import { esc, euros, precoDe, dataPorExtenso, markdown, inline, textoSimples, numeroWhatsApp, moradaCompleta } from './util.mjs';
import { icones, ilustracoes } from './icones.mjs';
import { numeroPortugues, idadeTexto, NOTA_IDADE } from '../lib/regras.mjs';
import { imagem, preco, cartaoProduto, migalhas, botaoSeta, desconto, promocaoAte } from './componentes.mjs';

const produtosDe = (ctx, cat) => ctx.produtos.filter((p) => p.categoria === cat);
const categoriaDe = (ctx, slug) => ctx.categorias.find((c) => c.slug === slug);

// ---------------------------------------------------------------- página inicial
/* Sem «Para cada fase, uma peça» (os círculos das categorias), desde 10 out 2026, e sem «Em casa de
   quem já tem» nem o bloco do Instagram («Para crianças livres, felizes e autónomas»), desde 12 out
   2026: a Célia pediu que saíssem. */
export function inicio(ctx) {
  const h = ctx.inicio;
  const capa = `<section class="capa">
  <div class="capa__caixa">
    <div class="capa__texto">
      <p class="etiqueta etiqueta--terracota">${esc(h.capa.etiqueta)}</p>
      <h1 class="capa__titulo"><span class="visualmente-escondido">${esc(ctx.site.marca)}: </span><span class="capa__l1">${esc(h.capa.tituloLinha1)}</span> <span class="capa__l2">${esc(h.capa.tituloLinha2)}</span></h1>
      <p class="capa__subtitulo">${esc(h.capa.texto)}</p>
      ${botaoSeta(ctx.url(h.capa.ligacao || '/loja/'), h.capa.botao, { classe: 'botao botao--mel' })}
    </div>
    <div class="capa__foto">${imagem(ctx, h.capa.foto, { tamanhos: '(min-width: 900px) 55vw, 100vw', prioridade: true })}</div>
  </div>
</section>`;

  // Vitrine: todos os artigos, pela ordem da loja. Sem separadores (Todos, Mais vendidos, Promoções,
  // Novidades): a Célia pediu «fica só Artigos» a 10 out 2026 — eram parecidos de mais com os da atoca.pt.
  const vitrine = `<section class="vitrine" aria-labelledby="vitrine-titulo">
  <div class="vitrine__topo">
    <h2 class="titulo-seccao titulo-seccao--salva" id="vitrine-titulo">${esc(h.vitrine.titulo)}</h2>
  </div>
  <div class="carrossel" data-carrossel>
    <div class="carrossel__pista" tabindex="0" role="region" aria-label="${esc(h.vitrine.titulo)}">
      ${ctx.produtos.map((p) => cartaoProduto(ctx, p)).join('\n')}
    </div>
    <div class="carrossel__controlos">
      <div class="carrossel__progresso" aria-hidden="true"><span></span></div>
      <button class="carrossel__botao" type="button" data-anterior>${icones.esquerda}<span class="visualmente-escondido">Anteriores</span></button>
      <button class="carrossel__botao" type="button" data-seguinte>${icones.direita}<span class="visualmente-escondido">Seguintes</span></button>
    </div>
  </div>
</section>`;

  const pz = h.personalizacao;
  /* O presente À FRENTE do texto (pedido da Célia, 10 out 2026), preso à primeira palavra: sozinho,
     podia ficar numa linha por cima de «Personalização» (a 800–1024 px ficava). */
  const etiquetaComPresente = (t) => {
    const [primeira = '', ...resto] = String(t ?? '').trim().split(/\s+/);
    return `<span class="personaliza__presente">${icones.presente}${esc(primeira)}</span>${resto.length ? ` ${esc(resto.join(' '))}` : ''}`;
  };
  const personalizacao = `<section class="personaliza" aria-labelledby="pz-titulo">
  <div class="personaliza__painel">
    <p class="personaliza__etiqueta">${etiquetaComPresente(pz.etiqueta)}</p>
    ${pz.opcoes?.length ? `<ul class="personaliza__lista" aria-hidden="true">${pz.opcoes.map((o, i) => `<li${i === 0 ? ' class="ativo"' : ''}>${esc(o)}</li>`).join('')}</ul>` : ''}
    <h2 id="pz-titulo" class="personaliza__titulo">${esc(pz.titulo)}</h2>
    <p>${esc(pz.texto)}</p>
  </div>
  <div class="personaliza__foto${pz.legenda ? ' personaliza__foto--legenda' : ''}">
    ${imagem(ctx, pz.foto, { tamanhos: '(min-width: 900px) 46vw, 100vw' })}
    ${pz.legenda ? `<p class="personaliza__legenda">${esc(pz.legenda)}</p>` : ''}
    ${botaoSeta(ctx.url('/personalizacao/'), pz.botao, { classe: 'botao botao--mel personaliza__botao' })}
  </div>
</section>`;

  const hi = h.historia;
  const historia = `<section class="historia" aria-labelledby="historia-titulo">
  ${hi.bolhas.map((b, i) => `<span class="bolha bolha--${i + 1}" aria-hidden="true">${esc(b)}</span>`).join('')}
  <p class="historia__etiqueta">${esc(hi.etiqueta)}</p>
  <h2 id="historia-titulo" class="historia__titulo">${esc(hi.titulo)}</h2>
  <p class="historia__texto">${esc(hi.texto)}</p>
  ${botaoSeta(ctx.url('/sobre-nos/'), hi.botao)}
</section>`;

  // As opiniões: as 3 mais recentes, em cartões fixos (sem carrossel), quando as houver.
  const recentes = ctx.opinioes.slice(0, 3);
  const familias = recentes.length ? `<section class="familias" aria-labelledby="familias-titulo">
  <h2 id="familias-titulo" class="titulo-seccao">O que dizem as famílias</h2>
  <ul class="opinioes-lista opinioes-lista--grelha">${recentes.map((o) => cartaoOpiniao(ctx, o, { artigo: true })).join('')}</ul>
  <p class="familias__mais"><a class="botao botao--contorno" href="${ctx.url('/opinioes/')}">Ver todas as opiniões</a></p>
</section>` : '';

  // O Instagram em grande (a Célia, 13 out 2026: «é lá que tem muitos feedbacks, mais fotos e a nossa
  // história desde sempre»): uma faixa com a conta e um botão, sem trazer o feed de lá (nem
  // terceiros nem cookies na página). Logo a seguir à história, que é o que lá continua.
  const ig = ctx.site.contactos.instagram;
  const instagram = ig ? `<section class="instagram" aria-labelledby="instagram-titulo">
  <div class="instagram__caixa">
    <span class="instagram__icone" aria-hidden="true">${icones.instagram}</span>
    <div class="instagram__texto">
      <p class="instagram__conta">@${esc(ig)} · ${esc(INSTAGRAM.seguidores)}</p>
      <h2 id="instagram-titulo" class="instagram__titulo">${esc(INSTAGRAM.titulo)}</h2>
      <p>${esc(INSTAGRAM.texto)}</p>
    </div>
    <a class="botao botao--mel instagram__botao" href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener">${icones.instagram}<span>${esc(INSTAGRAM.botao)}</span><span class="visualmente-escondido"> (abre o Instagram)</span></a>
  </div>
</section>` : '';

  const vantagens = `<section class="vantagens" aria-label="Porquê a Pokóto">
  <ul>${h.vantagens.map((v) => `<li>${ilustracoes[v.icone] || ''}<h3>${esc(v.titulo)}</h3><p>${esc(v.texto)}</p></li>`).join('')}</ul>
</section>`;

  const faixa = `<section class="faixa" aria-label="${esc(h.faixa.join(', '))}" data-faixa>
  <div class="faixa__pista" aria-hidden="true">${[0, 1, 2, 3].map(() => h.faixa.map((p) => `<span class="faixa__palavra">${esc(p)}</span><span class="faixa__sinal">${icones.estrela}</span>`).join('')).join('')}</div>
  <button class="faixa__pausa" type="button" aria-pressed="false" data-faixa-pausa>${icones.pausa}<span class="visualmente-escondido">Parar o movimento</span></button>
</section>`;

  const of = h.oficina;
  const oficina = `<section class="oficina" aria-labelledby="oficina-titulo">
  <div class="oficina__video">${video(ctx, of.video)}</div>
  <div class="oficina__texto">
    <p class="etiqueta etiqueta--salva">${esc(of.etiqueta)}</p>
    <h2 id="oficina-titulo" class="titulo-seccao">${esc(of.titulo)}</h2>
    <p>${esc(of.texto)}</p>
    ${botaoSeta(ctx.url('/loja/'), of.botao, { classe: 'botao botao--mel' })}
  </div>
</section>`;

  const ce = h.comoEncomendar;
  const comoEncomendar = `<section class="passos" aria-labelledby="passos-titulo">
  <h2 id="passos-titulo" class="titulo-seccao">${esc(ce.titulo)}</h2>
  <ol>${ce.passos.map((p) => `<li><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`).join('')}</ol>
  ${botaoSeta(ctx.url('/como-encomendar/'), 'Saber mais')}
</section>`;

  const org = organizacao(ctx);
  return {
    caminho: '/',
    titulo: h.seo.titulo,
    descricao: h.seo.descricao,
    classe: 'pagina-inicio',
    jsonld: [org, { '@context': 'https://schema.org', '@type': 'WebSite', '@id': ctx.absoluto('/#site'), name: ctx.site.marca, alternateName: outrosNomes(ctx), url: ctx.absoluto('/'), inLanguage: 'pt-PT', publisher: { '@id': ctx.absoluto('/#loja') } }],
    conteudo: [capa, vitrine, personalizacao, historia, familias, instagram, vantagens, faixa, oficina, comoEncomendar].join('\n\n'),
  };
}

/* O aviso das gravações (a Célia, 13 out 2026: «90% das perguntas são de gravações», feitas pelo
   WhatsApp antes de haver encomenda). O mesmo texto na ficha, junto ao campo, no carrinho, antes do
   botão, e na página da personalização ({{avisoGravacao}}). */
/* A faixa do Instagram na página inicial. */
const INSTAGRAM = {
  seguidores: 'mais de 50 mil seguidores', // 52 mil a 7 out 2026: arredondado para baixo, para continuar verdade
  titulo: 'As nossas peças em casa das famílias',
  texto: 'As opiniões de quem já tem, as gravações novas e as peças a sair da oficina.',
  botao: 'Seguir @pokotowood',
};

export const AVISO_GRAVACAO = {
  titulo: 'Maquete só depois do pagamento.',
  texto: 'Com a encomenda paga e confirmada, enviamos-lhe a maquete da gravação pelo WhatsApp. Só gravamos depois de a aprovar.',
};
export function avisoGravacao(ctx, { id = '', exemplos = true } = {}) {
  const ver = exemplos ? ` <a href="${ctx.url('/personalizacao/')}">Ver exemplos de gravações</a>` : '';
  return `<p class="aviso-gravacao"${id ? ` id="${id}"` : ''}>${icones.gravar}<span><strong>${esc(AVISO_GRAVACAO.titulo)}</strong> ${esc(AVISO_GRAVACAO.texto)}${ver}</span></p>`;
}

/* ---------------------------------------------------------------- as opiniões dos clientes
   Vêm do painel na publicação (ctx.opinioes: as publicadas, das mais recentes para as mais antigas;
   o porquê está em scripts/build.mjs e no painel, src/admin/opinioes.js). A média de estrelas só
   aparece a partir de 5 opiniões de uma peça: com duas ou três, uma média engana. */
const MIN_MEDIA = 5;
const dataPorExtensoDe = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Lisbon' });
const paragrafosDe = (t) => String(t).split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
export function estrelas(n, { rotulo = true } = {}) {
  const cheias = '<span class="estrelas__cheia">★</span>'.repeat(n);
  const vazias = '<span class="estrelas__vazia">★</span>'.repeat(5 - n);
  return `<span class="estrelas"${rotulo ? ` role="img" aria-label="${n} de 5 estrelas"` : ' aria-hidden="true"'}>${cheias}${vazias}</span>`;
}
export const mediaDe = (lista) => Math.round((lista.reduce((s, o) => s + o.estrelas, 0) / lista.length) * 10) / 10;
const mediaEmTexto = (m) => m.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function cartaoOpiniao(ctx, o, { artigo = false } = {}) {
  const p = artigo ? ctx.produtos.find((x) => x.slug === o.artigo) : null;
  return `<li class="opiniao">
  <p class="opiniao__topo">${estrelas(o.estrelas)}<time class="opiniao__data" datetime="${esc(o.data)}">${esc(dataPorExtensoDe(o.data))}</time></p>
  <blockquote class="opiniao__texto">${paragrafosDe(o.texto)}</blockquote>
  <p class="opiniao__quem">${esc(o.nome)}${o.localidade ? `, ${esc(o.localidade)}` : ''}${p ? ` · <a href="${ctx.url(`/produtos/${p.slug}/`)}">${esc(p.nome)}</a>` : ''}</p>
  ${o.resposta ? `<div class="opiniao__resposta"><p class="opiniao__resposta-quem">Resposta da ${esc(ctx.site.marca)}</p>${paragrafosDe(o.resposta.texto)}</div>` : ''}
</li>`;
}
/* O que a lei pede junto das opiniões (DL 57/2008, art. 10.º-A, n.º 4; DL 24/2014, art. 4.º-B): se e
   como se garante que são de quem comprou, o que se publica e o que fica de fora, a ordem, a média,
   e como alterar, retirar ou denunciar. O texto é o da pesquisa legal de 13 out 2026, ajustado ao
   convite pessoal (não há formulário aberto). */
function comoVerificamos(ctx) {
  const c = ctx.site.contactos;
  const contacto = [c.email ? `por <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '', c.whatsapp ? `pelo <a href="${ctx.whatsapp('Olá! É sobre uma opinião do site.')}">WhatsApp</a>` : ''].filter(Boolean).join(' ou ');
  return `<section class="como-verificamos" id="como-verificamos" aria-labelledby="como-verificamos-titulo">
  <h2 id="como-verificamos-titulo">Como verificamos e publicamos as opiniões</h2>
  <p>Só publicamos opiniões de clientes que nos compraram a peça de que falam. Depois da entrega, enviamos a cada cliente, pelo WhatsApp, uma ligação pessoal para deixar a sua opinião, e só se escreve por essa ligação. Convidamos todos os clientes, da mesma forma.</p>
  <p>Publicamos todas as opiniões de clientes, positivas ou negativas, até 5 dias úteis depois de as recebermos. Só ficam de fora as que não conseguimos confirmar, as que ofendem alguém, as que têm dados pessoais de outras pessoas (como o nome ou a fotografia de uma criança) e as que fazem publicidade. Não alteramos o que escreveu: se for preciso, pedimos-lhe que corrija.</p>
  <p>Não pagamos nem oferecemos nada em troca de opiniões. Mostramos primeiro as mais recentes, todas durante o mesmo tempo (nunca menos de 6 meses), e a média de estrelas de uma peça, quando aparece, é a média simples de todas as suas opiniões publicadas. Podemos responder a cada opinião, por baixo dela.</p>
  <p>Quem escreveu pode alterar ou retirar a sua opinião a qualquer momento, pela ligação que recebe ao enviá-la${contacto ? `, ou pedindo-nos ${contacto}` : ''}. Se uma opinião lhe parecer falsa, avise-nos${contacto ? ` ${contacto}` : ''}.</p>
</section>`;
}

/* A capa de um vídeo na largura mais pequena (a miniatura da galeria da ficha). */
function capaDoVideo(ctx, nome) {
  const poster = ctx.manifesto.posters[`video-${nome}`];
  const w = poster.larguras[0];
  return `<img src="${ctx.asset(`img/video-${nome}-${poster.resumo}-${w}.webp`)}" width="${w}" height="${Math.round((w * poster.altura) / poster.largura)}" alt="" loading="lazy" decoding="async">`;
}

export function video(ctx, nome) {
  const poster = ctx.manifesto.posters[`video-${nome}`];
  if (!poster) throw new Error(`vídeo «${nome}» sem capa em media/video/${nome}.jpg`);
  const posterUrl = ctx.asset(`img/video-${nome}-${poster.resumo}-${poster.larguras[poster.larguras.length - 1]}.webp`);
  return `<div class="video" data-video>
  <video muted loop playsinline preload="none" poster="${posterUrl}" width="${poster.largura}" height="${poster.altura}" aria-label="Vídeo sem som: ${esc(ctx.videos[nome] || nome)}">
    <source src="${ctx.asset(ctx.ficheiros.videos[nome])}" type="video/mp4">
  </video>
  <button class="video__botao" type="button" aria-pressed="false" data-video-botao>${icones.tocar}<span class="visualmente-escondido">Ver o vídeo</span></button>
</div>`;
}

/* Os outros nomes por que a marca é procurada (13 out 2026: «Pokoto Wood» sem acento e «pokotowood» não
   davam o site no Google; o nome do site e da loja vão nos dados estruturados de todas as páginas). */
function outrosNomes(ctx) {
  const semAcentos = ctx.site.marca.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const colado = semAcentos.toLowerCase().replace(/[^a-z0-9]/g, '');
  return [...new Set([semAcentos, colado, ctx.site.contactos.instagram].filter((x) => x && x !== ctx.site.marca))];
}

export function organizacao(ctx) {
  const c = ctx.site.contactos;
  const e = ctx.site.empresa;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': ctx.absoluto('/#loja'),
    name: ctx.site.marca,
    description: ctx.site.descricao,
    url: ctx.absoluto('/'),
    logo: ctx.absoluto(`/assets/img/${ctx.manifesto.logo.altura[256].png}`),
    image: ctx.absoluto(`/assets/img/${ctx.manifesto.partilha._site}`),
    ...(ctx.site.fundadores ? { founder: ctx.site.fundadores.split(/ e /).map((n) => ({ '@type': 'Person', name: n.trim() })) } : {}),
    address: { '@type': 'PostalAddress', addressLocality: ctx.site.local.localidade, addressRegion: ctx.site.local.distrito, addressCountry: 'PT' },
    alternateName: outrosNomes(ctx),
    sameAs: [c.instagram && `https://www.instagram.com/${c.instagram}/`, c.instagram && `https://www.threads.com/@${c.instagram}`, c.facebook && `https://www.facebook.com/${c.facebook}`].filter(Boolean),
  };
  if (c.email) ld.email = c.email;
  if (c.whatsapp) ld.telephone = `+${numeroWhatsApp(c.whatsapp)}`;
  if (e.nif) ld.vatID = `PT${e.nif.replace(/\D/g, '')}`;
  return ld;
}

// ---------------------------------------------------------------- loja e categorias
/* O texto do topo da loja, como a Célia o ditou (10 out 2026). */
const TEXTO_LOJA = 'Fazemos tudo na nossa oficina, à mão. Escolha a peça, personalize e envie-nos a encomenda pelo WhatsApp. É confirmada no mesmo dia, com o prazo de entrega e os dados para o pagamento.';
export function loja(ctx, cat = null) {
  const c = cat && categoriaDe(ctx, cat);
  const lista = c ? produtosDe(ctx, cat) : ctx.produtos;
  const caminho = c ? `/loja/${c.slug}/` : '/loja/';
  const m = migalhas(ctx, [{ nome: 'Início', caminho: '/' }, { nome: 'Loja', caminho: '/loja/' }, ...(c ? [{ nome: c.nome, caminho }] : [])]);
  const chips = [{ slug: '', nome: 'Todos', icone: 'todos', n: ctx.produtos.length }, ...ctx.categorias.map((k) => ({ ...k, n: produtosDe(ctx, k.slug).length }))]
    .map((k) => {
      const href = ctx.url(k.slug ? `/loja/${k.slug}/` : '/loja/');
      const atual = (k.slug || null) === (cat || null);
      return `<li><a class="chip" href="${href}"${atual ? ' aria-current="page"' : ''}>${icones[k.icone] || ''}<span>${esc(k.nome)}</span><span class="chip__n">${k.n}</span></a></li>`;
    }).join('');
  const conteudo = `<div class="contentor loja">
  ${m.html}
  <header class="loja__topo">
    <h1 class="titulo-pagina">${esc(c ? c.titulo : 'Loja')}</h1>
    ${c ? `<div class="loja__texto">${markdown(c.resumo, ctx.url)}</div>` : `<p>${esc(TEXTO_LOJA)}</p>`}
  </header>
  <nav class="chips" aria-label="Categorias"><ul>${chips}</ul></nav>
  <p class="loja__conta">${lista.length} ${lista.length === 1 ? 'artigo' : 'artigos'}</p>
  <div class="grelha">
    ${lista.map((p) => cartaoProduto(ctx, p, { titulo: 'h2' })).join('\n')}
  </div>
</div>`;
  return {
    caminho,
    titulo: c ? `${c.titulo}` : 'Loja — torres de aprendizagem, Pikler e mobiliário Montessori',
    descricao: c ? textoSimples(c.resumo).slice(0, 158) : 'Torres de aprendizagem, triângulo e arco Pikler, estantes e roupeiros Montessori em madeira, feitos à mão e personalizados sem custos.',
    jsonld: [m.ld, {
      '@context': 'https://schema.org', '@type': 'ItemList',
      itemListElement: lista.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: ctx.absoluto(`/produtos/${p.slug}/`), name: p.nome })),
    }],
    conteudo,
  };
}

// ---------------------------------------------------------------- ficha de artigo
export function produto(ctx, p) {
  const c = categoriaDe(ctx, p.categoria);
  const caminho = `/produtos/${p.slug}/`;
  const m = migalhas(ctx, [{ nome: 'Início', caminho: '/' }, { nome: c.nome, caminho: `/loja/${c.slug}/` }, { nome: p.nome, caminho }]);
  const v = precoDe(p, ctx.hoje);
  const pct = desconto(ctx, p);

  // O vídeo do artigo vem logo a seguir à fotografia de capa, na mesma galeria (Renato e Célia,
  // 13 out 2026: solto por baixo da ficha ficava perdido; «Fica foto capa e a seguir um vídeo»).
  // Começa sozinho, sem som, quando se chega a ele.
  const itens = p.fotos.map((f, i) => ({ foto: f, n: i + 1 }));
  if (p.video) itens.splice(1, 0, { video: p.video });
  const galeria = `<div class="galeria" data-galeria>
    <div class="galeria__pista" tabindex="0" role="region" aria-label="${p.video ? 'Fotografias e vídeo' : 'Fotografias'} de ${esc(p.nome)}">
      ${itens.map((it) => (it.video
    ? `<figure class="galeria__foto galeria__foto--video" id="video">${video(ctx, it.video)}</figure>`
    : `<figure class="galeria__foto" id="foto-${it.n}">${imagem(ctx, it.foto, { tamanhos: '(min-width: 1000px) 46vw, 100vw', prioridade: it.n === 1 })}</figure>`)).join('\n')}
    </div>
    ${itens.length > 1 ? `<ul class="galeria__miniaturas">${itens.map((it, i) => `<li>${it.video
    ? `<button class="galeria__mini-video" type="button" data-foto="${i}">${capaDoVideo(ctx, it.video)}<span class="galeria__tocar">${icones.tocar}</span><span class="visualmente-escondido">Vídeo</span></button>`
    : `<button type="button" data-foto="${i}"${i === 0 ? ' aria-current="true"' : ''}>${imagem(ctx, it.foto, { tamanhos: '80px', alt: '' })}<span class="visualmente-escondido">Fotografia ${it.n} de ${p.fotos.length}</span></button>`}</li>`).join('')}</ul>` : ''}
  </div>`;

  const selos = [
    pct ? `<span class="selo selo--promocao">${esc(promocaoAte(ctx, p) || 'Promoção')}</span>` : '',
    p.personalizacao?.disponivel ? `<span class="selo selo--gravar">${icones.gravar}Personalização grátis</span>` : '',
    p.maisVendido ? '<span class="selo selo--vendido">Mais vendido</span>' : '',
  ].filter(Boolean).join('');

  const complementos = (p.complementos || []).map((k) => ({ ...k, p: ctx.produtos.find((x) => x.slug === k.produto) })).filter((k) => k.p);
  const pers = p.personalizacao || {};
  const form = p.vendaIsolada === false
    ? (() => {
      const hospedeiros = ctx.produtos.filter((x) => (x.complementos || []).some((k) => k.produto === p.slug));
      return `<div class="so-complemento">
        <p>A ${esc((p.nomeCurto || p.nome).toLowerCase())} junta-se ao ${hospedeiros.map((x) => `<strong>${esc(x.nome)}</strong>`).join(' ou ao ')}. Escolha-a na página de um deles:</p>
        <div class="so-complemento__botoes">${hospedeiros.map((x) => botaoSeta(ctx.url(`/produtos/${x.slug}/`) + `?com=${p.slug}`, `Juntar ao ${x.nomeCurto || x.nome}`, { classe: 'botao botao--mel' })).join('')}</div>
      </div>`;
    })()
    : `<form class="comprar" data-comprar="${esc(p.slug)}" novalidate>
      ${pers.disponivel ? `<div class="campo">
        <label for="pers-${p.slug}">Personalização${pers.obrigatoria ? '' : ' <span class="campo__opcional">(grátis, opcional)</span>'}</label>
        <input id="pers-${p.slug}" name="personalizacao" type="text" maxlength="80" autocomplete="off"${pers.obrigatoria ? ' required' : ''} placeholder="${pers.obrigatoria ? 'O nome a gravar' : 'Ex.: o nome ou uma frase'}" aria-describedby="${pers.obrigatoria ? '' : `pers-ajuda-${p.slug} `}pers-aviso-${p.slug}">
        ${pers.obrigatoria ? '' : `<p class="campo__ajuda" id="pers-ajuda-${p.slug}">Para um desenho, descreva a ideia em poucas palavras.</p>`}
        ${avisoGravacao(ctx, { id: `pers-aviso-${p.slug}` })}
      </div>` : ''}
      ${complementos.length ? `<fieldset class="complementos"><legend>Complete com</legend>${complementos.map((k) => {
        const kv = precoDe(k.p, ctx.hoje);
        return `<label class="complemento"><input type="checkbox" name="complemento" value="${esc(k.p.slug)}">${imagem(ctx, k.p.fotos[0], { tamanhos: '56px', alt: '', classe: 'complemento__foto' })}<span class="complemento__texto"><span class="complemento__nome">${esc(k.p.nome)}</span><span class="complemento__preco">+ ${euros(kv.atual)}${kv.anterior ? ` <s><span class="visualmente-escondido">em vez de </span>${euros(kv.anterior)}</s>` : ''}</span></span></label>`;
      }).join('')}</fieldset>` : ''}
      <div class="comprar__linha">
        <div class="quantidade" data-quantidade>
          <button type="button" data-menos>${icones.menos}<span class="visualmente-escondido">Menos um</span></button>
          <label class="visualmente-escondido" for="qtd-${p.slug}">Quantidade</label>
          <input id="qtd-${p.slug}" name="quantidade" type="number" inputmode="numeric" min="1" max="20" value="1">
          <button type="button" data-mais>${icones.mais}<span class="visualmente-escondido">Mais um</span></button>
        </div>
        <button class="botao botao--mel botao--largo" type="submit">${icones.carrinho}<span>Adicionar ao carrinho</span></button>
      </div>
      <p class="comprar__total" data-total aria-live="polite"></p>
      <p class="comprar__erro" data-erro role="alert" hidden></p>
    </form>
    <noscript><p><a class="botao botao--whatsapp" href="${ctx.whatsapp(`Olá! Gostava de encomendar: ${p.nome}.`)}">${icones.whatsapp}Encomendar pelo WhatsApp</a></p></noscript>`;

  const envio = p.envio;
  const linhaEnvio = (z) => (envio && Number.isFinite(envio[z.id]) ? euros(envio[z.id]) : 'a confirmar');
  const zonasEnvio = ctx.site.entrega.zonas.filter((z) => z.morada);
  /* A idade recomendada, à vista antes de encomendar, com a nota de que é indicativa. */
  const idade = idadeTexto(p.idade, p.idadeAte);
  /* O prazo, à vista na ficha (a pesquisa de 13 out: estava só em «Como encomendar»): a primeira
     frase do prazo da loja, «Fazemos cada peça por encomenda: fica pronta em 2 a 3 semanas…». */
  const prazoCurto = String(ctx.site.entrega.prazo || '').trim().split(/(?<=\.)\s+/)[0];
  const entrega = `<div class="entrega-caixa">
    ${idade ? `<p class="entrega-caixa__linha" data-idade>${icones.crianca}<span><strong>${esc(idade)}.</strong> ${esc(NOTA_IDADE)}</span></p>` : ''}
    ${prazoCurto ? `<p class="entrega-caixa__linha">${icones.relogio}<span>${esc(prazoCurto)}</span></p>` : ''}
    <p class="entrega-caixa__linha">${icones.local}<span><strong>Levantamento grátis</strong> na nossa oficina, em ${esc(ctx.site.local.localidade)}.</span></p>
    ${envio ? `<p class="entrega-caixa__linha">${icones.camiao}<span><strong>Envio:</strong> ${zonasEnvio.map((z) => `${esc(z.curto)} <span data-envio-zona="${z.id}">${linhaEnvio(z)}</span>`).join(' · ')}</span></p>` : ''}
    ${p.montagem ? `<p class="entrega-caixa__linha">${icones.caixa}<span>${inline(p.montagem, ctx.url)}</span></p>` : ''}
  </div>`;

  const medidas = p.medidas?.length ? `<table class="medidas"><tbody>${p.medidas.map((l) => `<tr><th scope="row">${esc(l.rotulo)}</th><td>${esc(l.valor)}</td></tr>`).join('')}</tbody></table>` : '';
  const quadroEnvio = envio ? `<table class="medidas"><thead><tr><th scope="col">Entrega</th><th scope="col">${esc(p.nomeCurto || p.nome)}</th>${complementos.map((k) => `<th scope="col">Com ${esc((k.p.nomeCurto || k.p.nome).toLowerCase())}</th>`).join('')}</tr></thead><tbody>
    <tr><th scope="row">Levantamento em ${esc(ctx.site.local.localidade)}</th><td>Grátis</td>${complementos.map(() => '<td>Grátis</td>').join('')}</tr>
    ${zonasEnvio.map((z) => `<tr><th scope="row">${esc(z.curto)}</th><td>${linhaEnvio(z)}</td>${complementos.map((k) => `<td>${Number.isFinite(envio[z.id]) && Number.isFinite(k.envioExtra?.[z.id]) ? euros(envio[z.id] + k.envioExtra[z.id]) : 'a confirmar'}</td>`).join('')}</tr>`).join('')}
  </tbody></table>` : '';
  const e = ctx.site.empresa;
  const fabricante = [e.nome ? `${e.nome} (${ctx.site.marca})` : ctx.site.marca, e.morada ? moradaCompleta(e) : '', ctx.site.contactos.email].filter(Boolean).map(esc).join(' · ');

  const acordeoes = `<div class="acordeoes">
    ${medidas ? `<details><summary>${icones.regua}Medidas</summary><div class="acordeoes__corpo">${medidas}<p class="nota">Medidas aproximadas. Cada peça é feita à mão: pode haver pequenas diferenças de uma para outra.</p></div></details>` : ''}
    ${pers.disponivel ? `<details><summary>${icones.gravar}Personalização</summary><div class="acordeoes__corpo"><p>${pers.obrigatoria ? 'O nome vai gravado na régua.' : 'Pode gravar o nome do seu filho, uma frase ou um desenho. A gravação está incluída no preço.'} Depois de a encomenda estar paga e confirmada, enviamos a maquete para aprovar, e só depois gravamos.</p><p><a href="${ctx.url('/personalizacao/')}">Como funciona a personalização</a></p></div></details>` : ''}
    ${envio ? `<details><summary>${icones.camiao}Envio e entrega</summary><div class="acordeoes__corpo">${quadroEnvio}<p><a href="${ctx.url('/como-encomendar/')}">Como encomendar e prazos</a></p></div></details>` : ''}
    <details><summary>${icones.escudo}Segurança e fabricante</summary><div class="acordeoes__corpo"><ul><li>Use sempre sob a supervisão de um adulto.</li><li>${/desmontad/i.test(p.montagem || '') ? 'Monte e use' : 'Use'} a peça numa superfície plana e estável${p.categoria === 'torres-de-aprendizagem' ? ', sempre encostada a uma bancada' : ''}.</li></ul><p class="nota">Fabricante: ${fabricante}.</p></div></details>
  </div>`;

  const ops = ctx.opinioes.filter((o) => o.artigo === p.slug);
  const blocoOpinioes = ops.length ? `<section class="opinioes-artigo" aria-labelledby="op-titulo">
    <h2 id="op-titulo" class="titulo-seccao">Opiniões de quem comprou</h2>
    ${ops.length >= MIN_MEDIA ? `<p class="opinioes-media">${estrelas(Math.round(mediaDe(ops)))} <strong>${mediaEmTexto(mediaDe(ops))} de 5</strong> · ${ops.length} opiniões</p>` : ''}
    <ul class="opinioes-lista">${ops.map((o) => cartaoOpiniao(ctx, o)).join('')}</ul>
    <p class="nota"><a href="${ctx.url('/opinioes/#como-verificamos')}">Como verificamos as opiniões</a></p>
  </section>` : '';

  const relacionados = ctx.produtos.filter((x) => x.slug !== p.slug && x.vendaIsolada !== false)
    .sort((a, b) => (b.categoria === p.categoria) - (a.categoria === p.categoria) || a.ordem - b.ordem).slice(0, 4);

  const conteudo = `<div class="contentor produto">
  ${m.html}
  <div class="produto__grelha">
    ${galeria}
    <div class="produto__info">
      ${selos ? `<div class="produto__selos">${selos}</div>` : ''}
      <h1 class="produto__nome">${esc(p.nome)}</h1>
      ${preco(ctx, p, { grande: true })}
      <div class="produto__resumo">${markdown(p.descricao, ctx.url)}</div>
      ${form}
      ${entrega}
      ${acordeoes}
    </div>
  </div>
  ${blocoOpinioes}
  <section class="relacionados" aria-labelledby="rel-titulo">
    <h2 id="rel-titulo" class="titulo-seccao">Os pequenos também adoram</h2>
    <div class="grelha">${relacionados.map((x) => cartaoProduto(ctx, x)).join('\n')}</div>
  </section>
</div>`;

  const offer = {
    '@type': 'Offer',
    url: ctx.absoluto(caminho),
    priceCurrency: 'EUR',
    price: v.atual.toFixed(2),
    availability: 'https://schema.org/MadeToOrder',   // não há stock: tudo é feito por encomenda (Célia, 8 out 2026)
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': ctx.absoluto('/#loja') },
  };
  if (v.ate) offer.priceValidUntil = v.ate;
  if (envio) {
    offer.shippingDetails = zonasEnvio.filter((z) => Number.isFinite(envio[z.id])).map((z) => ({
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: envio[z.id].toFixed(2), currency: 'EUR' },
      shippingDestination: z.id === 'espanha'
        ? { '@type': 'DefinedRegion', addressCountry: 'ES' }
        : { '@type': 'DefinedRegion', addressCountry: 'PT', ...(z.id === 'ilhas' ? { addressRegion: ['PT-20', 'PT-30'] } : {}) },
    }));
  }
  const ldProduto = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nome,
    description: p.resumo,
    image: p.fotos.slice(0, 4).map((f) => {
      const mm = ctx.manifesto.fotos[f];
      return ctx.absoluto(`/assets/img/${f}-${mm.resumo}-${mm.larguras[mm.larguras.length - 1]}.webp`);
    }),
    brand: { '@type': 'Brand', name: ctx.site.marca },
    category: c.nome,
    offers: offer,
    ...(idade ? { audience: { '@type': 'PeopleAudience', suggestedMinAge: Math.round((p.idade / 12) * 100) / 100 } } : {}),
    /* As estrelas para o Google: só no Product (as de uma loja sobre si mesma, no Store, não contam)
       e só a partir de 5 opiniões, como no ecrã. */
    ...(ops.length >= MIN_MEDIA ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: mediaDe(ops), reviewCount: ops.length, bestRating: 5, worstRating: 1 },
      review: ops.slice(0, 10).map((o) => ({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: o.estrelas, bestRating: 5, worstRating: 1 }, author: { '@type': 'Person', name: o.nome }, datePublished: o.data, reviewBody: o.texto })),
    } : {}),
  };
  return {
    caminho,
    titulo: p.nome,
    descricao: `${p.resumo} ${euros(v.atual)}${v.anterior ? ` (antes ${euros(v.anterior)})` : ''}. Feito à mão em ${ctx.site.local.localidade}.`.slice(0, 160),
    tipo: 'product',
    partilha: ctx.manifesto.partilha[p.slug],
    jsonld: [m.ld, ldProduto],
    conteudo,
  };
}

// ---------------------------------------------------------------- carrinho
export function carrinho(ctx) {
  const zonas = ctx.site.entrega.zonas;
  const conteudo = `<div class="contentor carrinho-pagina">
  <h1 class="titulo-pagina">O seu carrinho</h1>
  <div class="carrinho-pagina__grelha" data-carrinho-pagina>
    <section class="carrinho-pagina__artigos" aria-labelledby="artigos-titulo">
      <h2 id="artigos-titulo" class="visualmente-escondido">Artigos</h2>
      <div data-carrinho-lista><p class="carrinho-vazio">O carrinho está vazio. <a href="${ctx.url('/loja/')}">Ver a loja</a></p></div>
    </section>
    <aside class="carrinho-pagina__resumo" aria-labelledby="encomenda-titulo">
      <form class="encomenda" id="encomenda" novalidate data-encomenda>
        <h2 id="encomenda-titulo" class="encomenda__titulo">Finalizar a encomenda</h2>
        <fieldset class="encomenda__entrega">
          <legend>Como quer receber?</legend>
          ${zonas.map((z, i) => `<label class="opcao-entrega"><input type="radio" name="entrega" value="${esc(z.id)}"${i === 0 ? ' checked' : ''} required><span class="opcao-entrega__nome">${esc(z.nome)}</span><span class="opcao-entrega__preco" data-preco-zona="${esc(z.id)}"></span></label>`).join('\n')}
        </fieldset>
        <div class="totais" data-totais aria-live="polite"></div>
        <fieldset class="encomenda__dados">
          <legend>Os seus dados</legend>
          <div class="campo"><label for="e-nome">Nome</label><input id="e-nome" name="nome" type="text" autocomplete="name" required maxlength="80"></div>
          <div class="campo" data-so-envio><label for="e-morada">Morada</label><input id="e-morada" name="morada" type="text" autocomplete="street-address" maxlength="160" data-obrigatorio-envio></div>
          <div class="campos-lado" data-so-envio>
            <div class="campo"><label for="e-cp">Código postal</label><input id="e-cp" name="codigoPostal" type="text" autocomplete="postal-code" maxlength="12" data-obrigatorio-envio></div>
            <div class="campo"><label for="e-local">Localidade</label><input id="e-local" name="localidade" type="text" autocomplete="address-level2" maxlength="60" data-obrigatorio-envio></div>
          </div>
          <div class="campo"><label for="e-nif">NIF para a fatura <span class="campo__opcional">(opcional)</span></label><input id="e-nif" name="nif" type="text" inputmode="numeric" maxlength="12" autocomplete="off"></div>
          <div class="campo"><label for="e-notas">Observações <span class="campo__opcional">(opcional)</span></label><textarea id="e-notas" name="notas" rows="3" maxlength="500"></textarea></div>
        </fieldset>
        <div class="seguir">
          <p class="seguir__titulo">O que acontece a seguir</p>
          <ol>
            <li>Confirmamos consigo, pelo WhatsApp, o total e o prazo: só aí a encomenda fica feita.</li>
            <li>Enviamos-lhe os dados para o pagamento.</li>
            <li data-se-gravacao hidden><strong>Enviamos a maquete da gravação: só gravamos depois do seu «sim».</strong></li>
          </ol>
        </div>
        <p class="encomenda__aviso">${icones.info}<span>Ao carregar no botão abre-se o WhatsApp com a sua encomenda escrita. Nada do que escreve aqui fica guardado neste site.</span></p>
        <p class="comprar__erro" data-erro-encomenda role="alert" hidden></p>
        <button class="botao botao--whatsapp botao--largo" type="submit">${icones.whatsapp}<span>Enviar encomenda pelo WhatsApp</span></button>
        <div class="encomenda__enviada" data-enviada hidden>
          <p class="encomenda__enviada-cabeca">${icones.certo}<span>Abrimos o WhatsApp com a sua encomenda escrita<span data-enviada-quando></span>.</span></p>
          <p>Se ainda não carregou em enviar na conversa, faça-o lá. A encomenda fica feita quando a confirmarmos consigo pelo WhatsApp, com o total, o pagamento e o prazo. Se pediu uma gravação, enviamos a maquete para aprovar depois do pagamento.</p>
          ${ctx.site.contactos.instagram ? `<p class="encomenda__instagram">${icones.instagram}<span>Enquanto espera, veja as peças em casa das famílias no nosso Instagram: <a href="https://www.instagram.com/${esc(ctx.site.contactos.instagram)}/" target="_blank" rel="noopener">@${esc(ctx.site.contactos.instagram)}</a></span></p>` : ''}
          <button class="botao botao--whatsapp botao--largo" type="button" data-continuar>${icones.whatsapp}<span>Continuar no WhatsApp</span></button>
          <button class="botao botao--contorno botao--largo" type="button" data-copiar>${icones.copiar}<span>Copiar a mensagem</span></button>
          <p class="encomenda__enviada-mais"><button class="botao botao--texto" type="button" data-alterar>Alterar a encomenda</button><button class="botao botao--texto" type="button" data-esvaziar>Fazer outra encomenda</button></p>
        </div>
      </form>
    </aside>
  </div>
  <noscript><p class="nota">O carrinho precisa de JavaScript. Pode sempre encomendar diretamente pelo <a href="${ctx.whatsapp('Olá! Gostava de fazer uma encomenda.')}">WhatsApp</a>.</p></noscript>
</div>`;
  return { caminho: '/carrinho/', titulo: 'O seu carrinho', descricao: 'Reveja os artigos, escolha a entrega e envie-nos a encomenda pelo WhatsApp.', conteudo, classe: 'pagina-carrinho' };
}

// ---------------------------------------------------------------- páginas de texto
export function texto(ctx, pag) {
  const m = migalhas(ctx, [{ nome: 'Início', caminho: '/' }, { nome: pag.titulo, caminho: pag.caminho }]);
  const conteudo = `<div class="contentor texto-pagina${pag.largo ? ' texto-pagina--largo' : ''}">
  ${m.html}
  <article class="texto">
    <h1 class="titulo-pagina">${esc(pag.titulo)}</h1>
    ${pag.atualizado ? `<p class="texto__data">Atualizado a ${dataPorExtenso(pag.atualizado, true)}</p>` : ''}
    ${pag.foto ? `<div class="texto__foto">${imagem(ctx, pag.foto, { tamanhos: '(min-width: 900px) 760px, 100vw' })}</div>` : ''}
    ${pag.html}
  </article>
</div>`;
  return { caminho: pag.caminho, titulo: pag.tituloSeo || pag.titulo, descricao: pag.descricao, indexar: pag.indexar, jsonld: [m.ld], conteudo };
}

// ---------------------------------------------------------------- opiniões
export function opinioes(ctx) {
  const m = migalhas(ctx, [{ nome: 'Início', caminho: '/' }, { nome: 'Opiniões', caminho: '/opinioes/' }]);
  const ops = ctx.opinioes;
  const ig = ctx.site.contactos.instagram;
  const conteudo = `<div class="contentor texto-pagina texto-pagina--largo">
  ${m.html}
  <h1 class="titulo-pagina">Opiniões de clientes</h1>
  <p class="texto__intro">O que dizem as famílias que já têm as nossas peças em casa, das mais recentes para as mais antigas.</p>
  ${ops.length
    ? `<ul class="opinioes-lista">${ops.map((o) => cartaoOpiniao(ctx, o, { artigo: true })).join('')}</ul>`
    : `<p class="opinioes-vazio">Ainda não há opiniões publicadas aqui.${ig ? ` Entretanto, veja o que as famílias nos dizem no nosso Instagram, <a href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener">@${esc(ig)}</a>.` : ''}</p>`}
  <p class="opinioes-pedir">${icones.coracao}<span>Comprou-nos uma peça? Depois da entrega, enviamos-lhe pelo WhatsApp uma ligação para deixar a sua opinião. Não a recebeu? <a href="${ctx.whatsapp('Olá! Comprei uma peça e gostava de deixar a minha opinião no site.')}">Peça-nos uma</a>.${ctx.google ? ` Também estamos no Google: <a href="${esc(ctx.google.ficha)}" target="_blank" rel="noopener">ver a nossa ficha</a> ou <a href="${esc(ctx.google.avaliar)}" target="_blank" rel="noopener">deixar lá uma opinião</a>.` : ''}</span></p>
  ${comoVerificamos(ctx)}
</div>`;
  return {
    caminho: '/opinioes/', titulo: 'Opiniões de clientes',
    descricao: `As opiniões de quem comprou na ${ctx.site.marca}: torres de aprendizagem, Pikler e mobiliário Montessori em madeira. Só de clientes, boas e menos boas.`,
    jsonld: [m.ld], conteudo,
  };
}

/* O formulário do convite (/opinioes/escrever/#c=<convite>) e da ligação de edição (#e=<…>): fora do
   Google e do sitemap. Sem JavaScript fica a primeira frase (não se envia nada sem ele). O resto
   (src/scripts/site.js, «opiniões») fala com o painel, em ctx.painel. */
export function escreverOpiniao(ctx) {
  const m = migalhas(ctx, [{ nome: 'Início', caminho: '/' }, { nome: 'Opiniões', caminho: '/opinioes/' }, { nome: 'Deixar a sua opinião', caminho: '/opinioes/escrever/' }]);
  // todas as peças (também as que só se vendem com outra: também se pode dar a opinião delas)
  const artigos = ctx.produtos.map((p) => `<option value="${esc(p.slug)}">${esc(p.nome)}</option>`).join('');
  const conteudo = `<div class="contentor texto-pagina">
  ${m.html}
  <h1 class="titulo-pagina" tabindex="-1" data-escrever-titulo>Deixar a sua opinião</h1>
  <div class="escrever" data-escrever data-api="${esc(ctx.painel)}" data-whatsapp="${esc(ctx.whatsapp('Olá! A ligação para deixar a minha opinião não funciona.'))}">
    <div data-passo="sem-ligacao">
      <p>Para deixar a sua opinião, use a ligação que lhe enviámos pelo WhatsApp depois da entrega: é ela que mostra que nos comprou a peça.</p>
      <p>Não a recebeu, ou já não funciona? <a href="${ctx.whatsapp('Olá! Comprei uma peça e gostava de deixar a minha opinião no site.')}">Peça-nos uma</a>.</p>
    </div>
    <p data-passo="a-abrir" hidden>A abrir…</p>
    <div data-passo="aviso" hidden><p class="escrever__aviso" data-aviso></p></div>
    <div data-passo="minha" hidden>
      <p class="escrever__estado" data-minha-estado></p>
      <ul class="opinioes-lista" data-minha-cartao></ul>
      <div class="botoes"><button class="botao botao--mel" type="button" data-alterar>Alterar a opinião</button><button class="botao botao--contorno" type="button" data-retirar>Retirar a opinião</button></div>
    </div>
    <form class="escrever__form" data-passo="formulario" hidden novalidate>
      <p class="escrever__sobre" data-sobre hidden></p>
      <div class="campo" data-campo-artigo hidden><label for="op-artigo">A peça que comprou</label><select id="op-artigo" name="artigo"><option value="">Escolha a peça</option>${artigos}</select></div>
      <fieldset class="campo estrelas-escolha">
        <legend>Quantas estrelas dá à peça?</legend>
        <div class="estrelas-escolha__opcoes">${[1, 2, 3, 4, 5].map((n) => `<input type="radio" id="op-e${n}" name="estrelas" value="${n}"><label for="op-e${n}"><span aria-hidden="true">★</span><span class="visualmente-escondido">${n} ${n === 1 ? 'estrela' : 'estrelas'}</span></label>`).join('')}</div>
      </fieldset>
      <div class="campo"><label for="op-texto">A sua opinião</label><textarea id="op-texto" name="texto" rows="6" maxlength="1500" aria-describedby="op-texto-ajuda"></textarea><p class="campo__ajuda" id="op-texto-ajuda">Conte o que gostou e o que mudaria. Para proteger as crianças, não escreva o nome delas.</p></div>
      <div class="campo"><label for="op-nome">O seu nome, como quer que apareça</label><input id="op-nome" name="nome" type="text" maxlength="40" autocomplete="name" aria-describedby="op-nome-ajuda"><p class="campo__ajuda" id="op-nome-ajuda">Por exemplo, «Ana S.»: o nome próprio e a inicial do apelido.</p></div>
      <div class="campo"><label for="op-local">A sua localidade <span class="campo__opcional">(opcional)</span></label><input id="op-local" name="localidade" type="text" maxlength="40" autocomplete="address-level2"></div>
      <div class="escrever__armadilha" aria-hidden="true"><label for="op-site">Não preencha este campo</label><input id="op-site" name="site" type="text" tabindex="-1" autocomplete="off"></div>
      <label class="escrever__autorizo"><input type="checkbox" name="autorizo"> <span>Autorizo a ${esc(ctx.site.marca)} a publicar esta opinião neste site, com o nome e a localidade que indiquei. Posso pedir para a retirar a qualquer momento. <a href="${ctx.url('/politica-de-privacidade/#opinioes')}">Como tratamos estes dados</a></span></label>
      <p class="comprar__erro" data-erro role="alert" hidden></p>
      <button class="botao botao--mel botao--largo" type="submit" data-enviar>Enviar a opinião</button>
    </form>
    <div data-passo="enviada" hidden>
      <p class="escrever__ok">${icones.certo}<span data-enviada-texto>Obrigada pela sua opinião! Vamos lê-la e publicá-la até 5 dias úteis depois.</span></p>
      <p>Guarde esta ligação: é por ela que pode ver, alterar ou retirar a sua opinião.</p>
      <p class="escrever__ligacao"><input type="text" readonly data-ligacao aria-label="A ligação para ver, alterar ou retirar a sua opinião"><button class="botao botao--contorno" type="button" data-copiar>Copiar</button></p>
      ${ctx.google ? `<p class="escrever__google">Se quiser, deixe também a sua opinião no Google: ajuda outras famílias a encontrar-nos. <a href="${esc(ctx.google.avaliar)}" target="_blank" rel="noopener">Avaliar no Google</a></p>` : ''}
    </div>
  </div>
  <p class="nota"><a href="${ctx.url('/opinioes/#como-verificamos')}">Como verificamos e publicamos as opiniões</a></p>
</div>`;
  return { caminho: '/opinioes/escrever/', titulo: 'Deixar a sua opinião', descricao: `Deixe a sua opinião sobre a peça que comprou na ${ctx.site.marca}.`, indexar: false, jsonld: [m.ld], conteudo };
}

export function contactos(ctx) {
  const c = ctx.site.contactos;
  const m = migalhas(ctx, [{ nome: 'Início', caminho: '/' }, { nome: 'Contactos', caminho: '/contactos/' }]);
  const cartoes = [];
  if (c.whatsapp) cartoes.push(`<li>${icones.whatsapp}<h2>WhatsApp</h2><p><a href="${ctx.whatsapp('Olá!')}">${esc(ctx.numeroLegivel(c.whatsapp))}</a></p><p class="nota">${esc(ctx.custoChamada(c.whatsapp))}</p></li>`);
  else cartoes.push(`<li>${icones.whatsapp}<h2>WhatsApp</h2><p>${ctx.marcador('o número de WhatsApp das encomendas')}</p></li>`);
  /* O telefone, para ligar, com a nota que a lei pede junto de um número (DL 59/2021): o custo
     depende da rede. Um que não seja português fica de fora (as regras avisam). */
  const tel = numeroPortugues(c.telefone);
  if (tel) cartoes.push(`<li>${icones.telefone}<h2>Telefone</h2><p><a href="tel:+351${tel}">${esc(ctx.numeroLegivel(tel))}</a></p><p class="nota">${esc(ctx.custoChamada(tel))}</p></li>`);
  if (c.email) cartoes.push(`<li>${icones.email}<h2>Email</h2><p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p></li>`);
  if (c.instagram) cartoes.push(`<li>${icones.instagram}<h2>Instagram</h2><p><a href="https://www.instagram.com/${esc(c.instagram)}/" target="_blank" rel="noopener">@${esc(c.instagram)}</a></p></li>`);
  if (c.facebook) cartoes.push(`<li>${icones.facebook}<h2>Facebook</h2><p><a href="https://www.facebook.com/${esc(c.facebook)}" target="_blank" rel="noopener">Pokóto Wood</a></p></li>`);
  cartoes.push(`<li>${icones.local}<h2>Oficina</h2><p>${esc(ctx.site.local.localidade)}, distrito de ${esc(ctx.site.local.distrito)}</p><p class="nota">Levantamentos e visitas com marcação prévia.</p></li>`);
  const conteudo = `<div class="contentor texto-pagina texto-pagina--largo">
  ${m.html}
  <h1 class="titulo-pagina">Contactos</h1>
  <p class="texto__intro">Encomendas, dúvidas sobre medidas ou uma ideia de personalização: fale connosco. Respondemos pelo WhatsApp, por email ou pelas redes sociais.</p>
  <ul class="contactos">${cartoes.join('')}</ul>
</div>`;
  return { caminho: '/contactos/', titulo: 'Contactos', descricao: `Fale com a ${ctx.site.marca}: WhatsApp, ${tel ? 'telefone, ' : ''}email, Instagram e Facebook. Oficina em ${ctx.site.local.localidade}.`, jsonld: [m.ld, organizacao(ctx)], conteudo };
}

export function erro404(ctx) {
  const conteudo = `<div class="contentor texto-pagina erro">
  <h1 class="titulo-pagina">Esta página não existe</h1>
  <p>Pode ter mudado de sítio, ou o endereço tem um erro. Experimente a loja:</p>
  ${botaoSeta(ctx.url('/loja/'), 'Ver a loja', { classe: 'botao botao--mel' })}
</div>`;
  return { caminho: '/404.html', titulo: 'Página não encontrada', descricao: 'Esta página não existe.', conteudo };
}
