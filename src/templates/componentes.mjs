// Peças repetidas: imagens, preços, cartões de artigo, migalhas, e as peças legais comuns.
import { esc, euros, precoDe, dataPorExtenso } from './util.mjs';
import { icones } from './icones.mjs';
import { livroReclamacoes, VERSAO as LEGAL_COMUM_VERSAO } from '../../legal-comum/index.mjs';

/* AS PEÇAS DA BIBLIOTECA legal-comum (a cópia está em legal-comum/, instalada por
   _ferramentas/legal-comum/instalar.mjs), entre os marcadores que o verificar-versoes.mjs dela
   procura nas páginas publicadas: <!-- legal-comum:<peça> v<versão> --> … <!-- /legal-comum:<peça> -->. */
export const pecaLegal = (nome, html) => `<!-- legal-comum:${nome} v${LEGAL_COMUM_VERSAO} -->${html}<!-- /legal-comum:${nome} -->`;

/* A ligação ao Livro de Reclamações Electrónico, com o ícone (DL 156/2005, art. 5.º-B, n.º 2: «em local
   visível e de forma destacada»), na variante DISCRETA da biblioteca (o Renato, 22 out 2026: nada de botão
   com caixa): a letra, o tamanho e a cor das ligações vizinhas, nunca mais pequena nem esbatida. No rodapé
   de todas as páginas, na lista da informação legal, e nos Contactos; o CSS (livroCss) vai anexado à folha
   de estilos na construção. */
export const livroBotao = () => pecaLegal('livro', livroReclamacoes());

/* A nota legal da promoção, por baixo do preço da ficha (DL 70/2007, art. 5.º): o período e o preço mais
   baixo dos 30 dias anteriores ao início — que é, por lei, o preço riscado. Só com a data de início
   (promocaoDesde); sem ela, fica o selo «Promoção até …» de sempre, e as regras lembram a data. */
export function promocaoNota(ctx, p) {
  const v = precoDe(p, ctx.hoje);
  const desde = typeof p.promocaoDesde === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.promocaoDesde) ? p.promocaoDesde : '';
  if (!v.anterior || !v.ate || !desde) return '';
  const mesmoAno = desde.slice(0, 4) === v.ate.slice(0, 4);
  return `<p class="preco__promocao">Promoção de ${dataPorExtenso(desde, !mesmoAno)} a ${dataPorExtenso(v.ate, true)} · preço mais baixo nos 30 dias anteriores: ${euros(v.anterior)}</p>`;
}

// <picture> com AVIF + WebP em várias larguras. «tamanhos» é o atributo sizes: diz ao browser
// a largura em que a imagem vai aparecer, para escolher a versão certa.
export function imagem(ctx, nome, { tamanhos = '100vw', classe = '', prioridade = false, alt, foco, proporcao } = {}) {
  const m = ctx.manifesto.fotos[nome] || ctx.manifesto.posters[nome];
  if (!m) throw new Error(`imagem «${nome}» não existe em media/fotos (nem é a capa de um vídeo)`);
  const info = ctx.fotos[nome] || {};
  const texto = alt ?? info.alt ?? '';
  const ponto = foco ?? info.foco ?? '50% 50%';
  const srcset = (fmt) => m.larguras.map((w) => `${ctx.asset(`img/${nome}-${m.resumo}-${w}.${fmt}`)} ${w}w`).join(', ');
  const fontes = m.formatos.filter((f) => f !== 'webp').map((f) => `<source type="image/${f}" srcset="${srcset(f)}" sizes="${tamanhos}">`).join('');
  const meio = m.larguras.find((w) => w >= 720) || m.larguras[m.larguras.length - 1];
  const estilo = [ponto !== '50% 50%' ? `object-position:${ponto}` : '', proporcao ? `aspect-ratio:${proporcao}` : ''].filter(Boolean).join(';');
  return `<picture class="${esc(classe)}">${fontes}<img src="${ctx.asset(`img/${nome}-${m.resumo}-${meio}.webp`)}" srcset="${srcset('webp')}" sizes="${tamanhos}" width="${m.largura}" height="${m.altura}" alt="${esc(texto)}"${prioridade ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${estilo ? ` style="${estilo}"` : ''}></picture>`;
}

// O preço como se mostra: o de hoje, e o anterior riscado quando há promoção.
export function preco(ctx, p, { grande = false, desde = false } = {}) {
  const v = precoDe(p, ctx.hoje);
  const atual = `<span class="preco__atual">${desde ? '<span class="preco__desde">Desde </span>' : ''}${euros(v.atual)}</span>`;
  if (!v.anterior) return `<p class="preco${grande ? ' preco--grande' : ''}">${atual}</p>`;
  return `<p class="preco preco--promocao${grande ? ' preco--grande' : ''}">${atual} <s class="preco__antes"><span class="visualmente-escondido">em vez de </span>${euros(v.anterior)}</s></p>`;
}

export function desconto(ctx, p) {
  const v = precoDe(p, ctx.hoje);
  if (!v.anterior) return '';
  return Math.round((1 - v.atual / v.anterior) * 100);
}

export function promocaoAte(ctx, p) {
  const v = precoDe(p, ctx.hoje);
  return v.anterior && v.ate ? `Promoção até ${dataPorExtenso(v.ate)}` : '';
}

// Cartão de artigo: a fotografia quadrada, o nome e o preço. O cartão inteiro leva ao artigo
// (a ligação do nome estende-se por cima dele com ::after — nunca display:contents, que tira o
// foco do teclado).
export function cartaoProduto(ctx, p, { tamanhos = '(min-width: 1100px) 23vw, (min-width: 700px) 31vw, 46vw', titulo = 'h3' } = {}) {
  const v = precoDe(p, ctx.hoje);
  const pct = desconto(ctx, p);
  return `<article class="cartao">
  <div class="cartao__foto">${imagem(ctx, p.fotos[0], { tamanhos, classe: 'cartao__img' })}${pct ? `<span class="selo selo--promocao">−${pct}%</span>` : ''}${p.maisVendido ? '<span class="selo selo--vendido">Mais vendido</span>' : ''}</div>
  <${titulo} class="cartao__nome"><a class="cartao__ligacao" href="${ctx.url(`/produtos/${p.slug}/`)}">${esc(p.nome)}</a></${titulo}>
  ${preco(ctx, p)}
</article>`;
}

export function migalhas(ctx, itens) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.nome, item: ctx.absoluto(i.caminho) })),
  };
  const html = `<nav class="migalhas" aria-label="Está aqui"><ol>${itens
    .map((i, n) => (n === itens.length - 1 ? `<li><span aria-current="page">${esc(i.nome)}</span></li>` : `<li><a href="${ctx.url(i.caminho)}">${esc(i.nome)}</a></li>`))
    .join('')}</ol></nav>`;
  return { html, ld };
}

// Botão com a seta num círculo, como os do atoca («Descobrir mais ⟶»)
export function botaoSeta(href, texto, { classe = 'botao botao--contorno', externo = false } = {}) {
  return `<a class="${classe}" href="${esc(href)}"${externo ? ' target="_blank" rel="noopener"' : ''}><span>${esc(texto)}</span><span class="botao__seta">${icones.direita}</span></a>`;
}
