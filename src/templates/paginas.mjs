// As páginas do site. Cada função devolve { caminho, titulo, descricao, conteudo, ... } e o
// build.mjs veste-a com a moldura (layout.mjs).
import { esc, euros, precoDe, dataPorExtenso, markdown, numeroWhatsApp, moradaCompleta } from './util.mjs';
import { icones, ilustracoes } from './icones.mjs';
import { imagem, preco, cartaoProduto, migalhas, botaoSeta, desconto, promocaoAte } from './componentes.mjs';

const produtosDe = (ctx, cat) => ctx.produtos.filter((p) => p.categoria === cat);
const categoriaDe = (ctx, slug) => ctx.categorias.find((c) => c.slug === slug);

// ---------------------------------------------------------------- página inicial
export function inicio(ctx) {
  const h = ctx.inicio;
  const capa = `<section class="capa">
  <div class="capa__caixa">
    <div class="capa__texto">
      <p class="etiqueta etiqueta--terracota">${esc(h.capa.etiqueta)}</p>
      <h1 class="capa__titulo"><span class="capa__l1">${esc(h.capa.tituloLinha1)}</span> <span class="capa__l2">${esc(h.capa.tituloLinha2)}</span></h1>
      <p class="capa__subtitulo">${esc(h.capa.texto)}</p>
      ${botaoSeta(ctx.url(h.capa.ligacao || '/loja/'), h.capa.botao, { classe: 'botao botao--mel' })}
    </div>
    <div class="capa__foto">${imagem(ctx, h.capa.foto, { tamanhos: '(min-width: 900px) 55vw, 100vw', prioridade: true })}</div>
  </div>
</section>`;

  // Vitrine: os separadores filtram a mesma lista; um separador sem artigos não aparece.
  const conta = (f) => ctx.produtos.filter((p) => f === 'todos' || (f === 'promocao' ? Boolean(precoDe(p, ctx.hoje).anterior) : p[f])).length;
  const seps = h.vitrine.separadores.filter((s) => conta(s.filtro) > 0);
  const vitrine = `<section class="vitrine" aria-labelledby="vitrine-titulo">
  <div class="vitrine__topo">
    <h2 class="titulo-seccao titulo-seccao--salva" id="vitrine-titulo">${esc(h.vitrine.titulo)}</h2>
    ${seps.length > 1 ? `<div class="separadores" role="group" aria-label="Mostrar">${seps.map((s, i) => `<button type="button" data-filtro="${esc(s.filtro)}" aria-pressed="${i === 0}">${esc(s.nome)}</button>`).join('')}</div>` : ''}
  </div>
  <div class="carrossel" data-carrossel>
    <div class="carrossel__pista" tabindex="0" role="region" aria-label="${esc(h.vitrine.titulo)}" data-filtro-ativo="${esc(seps[0]?.filtro || 'todos')}">
      ${ctx.produtos.map((p) => cartaoProduto(ctx, p)).join('\n')}
    </div>
    <div class="carrossel__controlos">
      <div class="carrossel__progresso" aria-hidden="true"><span></span></div>
      <button class="carrossel__botao" type="button" data-anterior>${icones.esquerda}<span class="visualmente-escondido">Anteriores</span></button>
      <button class="carrossel__botao" type="button" data-seguinte>${icones.direita}<span class="visualmente-escondido">Seguintes</span></button>
    </div>
  </div>
</section>`;

  const categorias = `<section class="faixa-cats" aria-labelledby="cats-titulo">
  <div class="faixa-cats__texto">
    <h2 id="cats-titulo">${esc(h.categorias.titulo)}</h2>
    <p>${esc(h.categorias.texto)}</p>
  </div>
  <ul class="circulos">
    ${ctx.categorias.map((c) => `<li><a href="${ctx.url(`/loja/${c.slug}/`)}"><span class="circulo">${imagem(ctx, c.foto, { tamanhos: '(min-width: 900px) 180px, 140px' })}</span><span class="circulo__nome">${esc(c.nome)}</span></a></li>`).join('\n')}
  </ul>
</section>`;

  const pz = h.personalizacao;
  const personalizacao = `<section class="personaliza" aria-labelledby="pz-titulo">
  <div class="personaliza__painel">
    <p class="personaliza__etiqueta">${esc(pz.etiqueta)}</p>
    <ul class="personaliza__lista" aria-hidden="true">${pz.opcoes.map((o, i) => `<li${i === 0 ? ' class="ativo"' : ''}>${esc(o)}</li>`).join('')}</ul>
    <h2 id="pz-titulo" class="personaliza__titulo">${esc(pz.titulo)}</h2>
    <p>${esc(pz.texto)}</p>
  </div>
  <div class="personaliza__foto">
    ${imagem(ctx, pz.foto, { tamanhos: '(min-width: 900px) 46vw, 100vw' })}
    <p class="personaliza__legenda">${esc(pz.legenda)}</p>
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

  const vantagens = `<section class="vantagens" aria-label="Porquê a Pokóto">
  <ul>${h.vantagens.map((v) => `<li>${ilustracoes[v.icone] || ''}<h3>${esc(v.titulo)}</h3><p>${esc(v.texto)}</p></li>`).join('')}</ul>
</section>`;

  // Só as fotografias cujo artigo está no site (um artigo escondido, ou com um problema que o
  // esconde, sai daqui em vez de partir a página).
  const casas = h.emCasa.fotos.map((f) => ({ f, p: ctx.produtos.find((x) => x.slug === f.produto) })).filter((x) => x.p);
  const emCasa = !casas.length ? '' : `<section class="em-casa" aria-labelledby="casa-titulo">
  <div class="em-casa__topo"><h2 id="casa-titulo" class="titulo-seccao">${esc(h.emCasa.titulo)}</h2><p>${esc(h.emCasa.texto)}</p></div>
  <ul class="em-casa__lista">
    ${casas.map(({ f, p }) => {
      return `<li class="em-casa__item">${imagem(ctx, f.foto, { tamanhos: '(min-width: 900px) 30vw, 80vw', classe: 'em-casa__foto' })}
      <div class="em-casa__cartao">${imagem(ctx, p.fotos[0], { tamanhos: '64px', classe: 'em-casa__mini', alt: '' })}<div><p class="em-casa__nome">${esc(p.nomeCurto || p.nome)}</p>${preco(ctx, p)}</div><a class="botao botao--terracota botao--pequeno" href="${ctx.url(`/produtos/${p.slug}/`)}">Ver<span class="visualmente-escondido"> ${esc(p.nome)}</span></a></div></li>`;
    }).join('\n')}
  </ul>
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

  const ig = h.instagram;
  const contaIg = ctx.site.contactos.instagram;
  const instagram = contaIg ? `<section class="instagram" aria-labelledby="ig-titulo">
  <h2 id="ig-titulo" class="titulo-seccao">${esc(ig.titulo)}</h2>
  <p class="instagram__chamada">${esc(ig.texto)} <a class="pilula" href="https://www.instagram.com/${esc(contaIg)}/" target="_blank" rel="noopener">@${esc(contaIg)}</a></p>
  <ul class="instagram__fotos">${ig.fotos.map((f) => `<li><a href="https://www.instagram.com/${esc(contaIg)}/" target="_blank" rel="noopener" tabindex="-1">${imagem(ctx, f, { tamanhos: '(min-width: 900px) 16vw, 45vw' })}</a></li>`).join('')}</ul>
</section>` : '';

  const org = organizacao(ctx);
  return {
    caminho: '/',
    titulo: h.seo.titulo,
    descricao: h.seo.descricao,
    classe: 'pagina-inicio',
    jsonld: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: ctx.site.marca, url: ctx.absoluto('/'), inLanguage: 'pt-PT' }],
    conteudo: [capa, vitrine, categorias, personalizacao, historia, vantagens, emCasa, faixa, oficina, comoEncomendar, instagram].join('\n\n'),
  };
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
    sameAs: [c.instagram && `https://www.instagram.com/${c.instagram}/`, c.facebook && `https://www.facebook.com/${c.facebook}`].filter(Boolean),
  };
  if (c.email) ld.email = c.email;
  if (c.whatsapp) ld.telephone = `+${numeroWhatsApp(c.whatsapp)}`;
  if (e.nif) ld.vatID = `PT${e.nif.replace(/\D/g, '')}`;
  return ld;
}

// ---------------------------------------------------------------- loja e categorias
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
    <p>${esc(c ? c.resumo : 'Tudo o que fazemos na nossa oficina, em madeira e à mão. Escolha a peça, escreva a personalização e envie-nos a encomenda pelo WhatsApp.')}</p>
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
    descricao: c ? `${c.resumo}`.slice(0, 158) : 'Torres de aprendizagem, triângulo e arco Pikler, estantes e roupeiros Montessori em madeira, feitos à mão e personalizados sem custos.',
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

  const galeria = `<div class="galeria" data-galeria>
    <div class="galeria__pista" tabindex="0" role="region" aria-label="Fotografias de ${esc(p.nome)}">
      ${p.fotos.map((f, i) => `<figure class="galeria__foto" id="foto-${i + 1}">${imagem(ctx, f, { tamanhos: '(min-width: 1000px) 46vw, 100vw', prioridade: i === 0 })}</figure>`).join('\n')}
    </div>
    ${p.fotos.length > 1 ? `<ul class="galeria__miniaturas">${p.fotos.map((f, i) => `<li><button type="button" data-foto="${i}"${i === 0 ? ' aria-current="true"' : ''}>${imagem(ctx, f, { tamanhos: '80px', alt: '' })}<span class="visualmente-escondido">Fotografia ${i + 1} de ${p.fotos.length}</span></button></li>`).join('')}</ul>` : ''}
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
        <input id="pers-${p.slug}" name="personalizacao" type="text" maxlength="80" autocomplete="off"${pers.obrigatoria ? ' required' : ''} placeholder="${pers.obrigatoria ? 'O nome a gravar' : 'Ex.: o nome, uma frase ou a ideia de um desenho'}" aria-describedby="pers-ajuda-${p.slug}">
        <p class="campo__ajuda" id="pers-ajuda-${p.slug}">${pers.obrigatoria ? 'O nome está incluído no preço.' : 'Para um desenho, descreva a ideia: combinamos os pormenores consigo pelo WhatsApp.'}</p>
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
  const entrega = `<div class="entrega-caixa">
    <p class="entrega-caixa__linha">${icones.local}<span><strong>Levantamento grátis</strong> na nossa oficina, em ${esc(ctx.site.local.localidade)}.</span></p>
    ${envio ? `<p class="entrega-caixa__linha">${icones.camiao}<span><strong>Envio:</strong> ${zonasEnvio.map((z) => `${esc(z.curto)} <span data-envio-zona="${z.id}">${linhaEnvio(z)}</span>`).join(' · ')}</span></p>` : ''}
    ${p.montagem ? `<p class="entrega-caixa__linha">${icones.caixa}<span>${esc(p.montagem)}</span></p>` : ''}
  </div>`;

  const medidas = p.medidas?.length ? `<table class="medidas"><tbody>${p.medidas.map((l) => `<tr><th scope="row">${esc(l.rotulo)}</th><td>${esc(l.valor)}</td></tr>`).join('')}</tbody></table>` : '';
  const quadroEnvio = envio ? `<table class="medidas"><thead><tr><th scope="col">Entrega</th><th scope="col">${esc(p.nomeCurto || p.nome)}</th>${complementos.map((k) => `<th scope="col">Com ${esc((k.p.nomeCurto || k.p.nome).toLowerCase())}</th>`).join('')}</tr></thead><tbody>
    <tr><th scope="row">Levantamento em ${esc(ctx.site.local.localidade)}</th><td>Grátis</td>${complementos.map(() => '<td>Grátis</td>').join('')}</tr>
    ${zonasEnvio.map((z) => `<tr><th scope="row">${esc(z.curto)}</th><td>${linhaEnvio(z)}</td>${complementos.map((k) => `<td>${Number.isFinite(envio[z.id]) && Number.isFinite(k.envioExtra?.[z.id]) ? euros(envio[z.id] + k.envioExtra[z.id]) : 'a confirmar'}</td>`).join('')}</tr>`).join('')}
  </tbody></table>` : '';
  const e = ctx.site.empresa;
  const fabricante = [e.nome ? `${e.nome} (${ctx.site.marca})` : ctx.site.marca, e.morada ? moradaCompleta(e) : '', ctx.site.contactos.email].filter(Boolean).map(esc).join(' · ');

  const acordeoes = `<div class="acordeoes">
    <details open><summary>${icones.info}Descrição</summary><div class="acordeoes__corpo">${markdown(p.descricao, ctx.url)}</div></details>
    ${medidas ? `<details><summary>${icones.regua}Medidas</summary><div class="acordeoes__corpo">${medidas}<p class="nota">Medidas aproximadas. Cada peça é feita à mão: pode haver pequenas diferenças de uma para outra.</p></div></details>` : ''}
    ${pers.disponivel ? `<details><summary>${icones.gravar}Personalização</summary><div class="acordeoes__corpo"><p>${pers.obrigatoria ? 'O nome vai gravado na régua e está incluído no preço.' : 'Pode gravar o nome do seu filho, uma frase ou um desenho. Está incluído no preço.'} Antes de começarmos, confirmamos consigo pelo WhatsApp como fica.</p><p><a href="${ctx.url('/personalizacao/')}">Como funciona a personalização</a></p></div></details>` : ''}
    ${envio ? `<details><summary>${icones.camiao}Envio e entrega</summary><div class="acordeoes__corpo">${quadroEnvio}<p class="nota">${esc(ctx.site.entrega.notaVariosArtigos)}</p><p><a href="${ctx.url('/como-encomendar/')}">Como encomendar e prazos</a></p></div></details>` : ''}
    <details><summary>${icones.escudo}Segurança e fabricante</summary><div class="acordeoes__corpo"><ul><li>Use sempre sob a supervisão de um adulto.</li><li>Monte e use a peça numa superfície plana e estável.</li><li>Verifique de vez em quando os parafusos e as uniões, e aperte-os se for preciso.</li></ul><p class="nota">Fabricante: ${fabricante}.</p></div></details>
  </div>`;

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
      <p class="produto__resumo">${esc(p.resumo)}</p>
      ${form}
      ${entrega}
      ${acordeoes}
    </div>
  </div>
  ${p.video ? `<section class="produto__video" aria-label="Vídeo">${video(ctx, p.video)}</section>` : ''}
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
    availability: 'https://schema.org/InStock',
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
        <p class="encomenda__aviso">${icones.info}<span>Ao carregar no botão abre-se o WhatsApp com a sua encomenda escrita. A encomenda fica feita quando a confirmarmos consigo por lá, com o total, o pagamento e o prazo. Nada do que escreve aqui fica guardado neste site.</span></p>
        <p class="comprar__erro" data-erro-encomenda role="alert" hidden></p>
        <button class="botao botao--whatsapp botao--largo" type="submit">${icones.whatsapp}<span>Enviar encomenda pelo WhatsApp</span></button>
        <div class="encomenda__enviada" data-enviada hidden>
          <p><strong>Abrimos o WhatsApp com a sua encomenda.</strong> Se não abriu, copie a mensagem e envie-a para nós pelo WhatsApp.</p>
          <button class="botao botao--contorno" type="button" data-copiar>${icones.copiar}<span>Copiar a mensagem</span></button>
          <button class="botao botao--texto" type="button" data-esvaziar>Esvaziar o carrinho</button>
        </div>
        <p class="nota">Peças personalizadas não têm direito de livre resolução (art. 17.º do DL 24/2014). <a href="${ctx.url('/termos-e-condicoes/')}">Termos e condições</a></p>
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
  return { caminho: pag.caminho, titulo: pag.tituloSeo || pag.titulo, descricao: pag.descricao, jsonld: [m.ld], conteudo };
}

export function contactos(ctx) {
  const c = ctx.site.contactos;
  const m = migalhas(ctx, [{ nome: 'Início', caminho: '/' }, { nome: 'Contactos', caminho: '/contactos/' }]);
  const cartoes = [];
  if (c.whatsapp) cartoes.push(`<li>${icones.whatsapp}<h2>WhatsApp</h2><p><a href="${ctx.whatsapp('Olá!')}">${esc(ctx.numeroLegivel(c.whatsapp))}</a></p><p class="nota">${esc(ctx.custoChamada(c.whatsapp))}</p></li>`);
  else cartoes.push(`<li>${icones.whatsapp}<h2>WhatsApp</h2><p>${ctx.marcador('o número de WhatsApp das encomendas')}</p></li>`);
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
  return { caminho: '/contactos/', titulo: 'Contactos', descricao: `Fale com a ${ctx.site.marca}: WhatsApp, email, Instagram e Facebook. Oficina em ${ctx.site.local.localidade}.`, jsonld: [m.ld, organizacao(ctx)], conteudo };
}

export function erro404(ctx) {
  const conteudo = `<div class="contentor texto-pagina erro">
  <h1 class="titulo-pagina">Esta página não existe</h1>
  <p>Pode ter mudado de sítio, ou o endereço tem um erro. Experimente a loja:</p>
  ${botaoSeta(ctx.url('/loja/'), 'Ver a loja', { classe: 'botao botao--mel' })}
</div>`;
  return { caminho: '/404.html', titulo: 'Página não encontrada', descricao: 'Esta página não existe.', conteudo };
}
