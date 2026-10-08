/* AS REGRAS DOS DADOS DA POKÓTO WOOD, NUM SÓ SÍTIO.
 *
 * Três leitores, e os três têm de ouvir o mesmo:
 *   · o gerador do site (scripts/build.mjs), antes de escrever as páginas;
 *   · o painel, no browser (o erro aparece por baixo do campo, antes de gravar);
 *   · o Worker do painel, ao gravar (recusa os problemas NOVOS que não sejam
 *     lembretes).
 * O painel usa uma CÓPIA BYTE A BYTE deste ficheiro (estatico/js/regras.js no
 * repositório pokoto-painel), com um teste de SHA-256 que falha se divergirem. Por
 * isso é um ES module puro: nenhum import, nada de node:*, fs, process ou
 * require. Corre tal e qual no browser, num Worker e no Node.
 * (A forma vem das regras da AMMA Creative, que vieram das da LR Motors.)
 *
 * CADA PROBLEMA TEM UMA CLASSE:
 *   · bloqueia   — a publicação pára e o site fica como estava. Só a estrutura
 *                  (um JSON que não se lê, um ficheiro sem a forma que o gerador
 *                  precisa) e o que todas as páginas usam (contactos, zonas de
 *                  entrega, a página inicial). Em PRODUÇÃO, também os dados que a
 *                  lei pede (identificação, NIF, morada — DL 7/2004, art. 10.º;
 *                  prazos e pagamento — DL 24/2014, art. 4.º).
 *   · neutraliza — um artigo, só na cópia que o gerador lê (o ficheiro do
 *                  repositório não muda — ver neutralizar()): sem nome, sem texto,
 *                  sem preço, sem fotografia, numa categoria que não existe, fica
 *                  escondido do site; uma fotografia que não existe não aparece.
 *                  Um problema de UM artigo nunca pára a publicação dos outros.
 *   · avisa      — só aviso. No painel, os que não são lembrete são erro de campo
 *                  (valor fora da lista, número fora dos limites, texto comprido de
 *                  mais): o painel não os deixa gravar. Os LEMBRETES (lembrete:
 *                  true) não são erro de ninguém: o painel grava na mesma e
 *                  mostra-os no Início.
 *
 * dados = {
 *   site:       texto | objecto | null,               content/site.json
 *   inicio:     texto | objecto | null,               content/inicio.json
 *   categorias: texto | objecto | null,               content/categorias.json
 *   fotos:      texto | objecto | null,               content/fotos.json
 *   artigos:    { <nome>: texto | objecto | null },   content/produtos/<nome>.json
 *   ficheirosFotos: [nome],  os nomes (sem .jpg) dos ficheiros em media/fotos/
 *   videos:         [nome],  os nomes (sem .mp4) dos vídeos em media/video/
 * }
 *   <nome> é o nome do ficheiro sem «.json», que é o endereço da página
 *   (/produtos/<nome>/). texto = o conteúdo do ficheiro; null = não existe.
 *   Uma chave de topo AUSENTE não se confere (o painel pode conferir só um
 *   artigo); presente e null é «falta o ficheiro».
 *
 * problema = {
 *   classe:   'bloqueia' | 'neutraliza' | 'avisa',
 *   chave:    estável ('artigo:<slug>:<regra>', 'site:<campo>[:<regra>]'…). O Worker
 *             compara as chaves do HEAD com as da gravação e recusa só as novas;
 *             por isso UMA CHAVE TEM SEMPRE A MESMA CLASSE.
 *   ficheiro: o caminho do ficheiro;
 *   ecra:     o ecrã do painel onde se corrige («Artigos › Arco de Pikler»);
 *   mensagem: para a dona, em português simples, sem caminhos de JSON;
 *   campo?:   o campo onde o painel mostra o erro ('preco', 'envio.ilhas');
 *   efeito?:  só nos «neutraliza»: 'esconder' | 'sem_fotografia';
 *   slug?, foto?, indice?, lembrete?
 * }
 *
 * «NÃO FOI DITO» E NULL SÃO O MESMO. E o vazio testa-se ANTES de converter:
 * Number(null) é 0, e 0 é uma escolha (memória numero-zero-nao-e-nao-foi-dito).
 */

/* ------------------------------------------------------------------ */
/* Onde estão as coisas                                                */
/* ------------------------------------------------------------------ */

export const FICHEIROS = Object.freeze({
  site: 'content/site.json',
  inicio: 'content/inicio.json',
  categorias: 'content/categorias.json',
  fotos: 'content/fotos.json',
});
export const PASTAS = Object.freeze({ artigos: 'content/produtos', fotos: 'media/fotos', videos: 'media/video' });
export const ficheiroDoArtigo = (nome) => `${PASTAS.artigos}/${nome}.json`;
export const ficheiroDaFoto = (nome) => `${PASTAS.fotos}/${nome}.jpg`;

/* As zonas de envio (as de content/site.json, entrega.zonas, menos o
   levantamento). Os portes de cada artigo e de cada complemento têm estas
   chaves. */
export const ZONAS_ENVIO = Object.freeze(['continente', 'ilhas', 'espanha']);
export const NOMES_ZONAS = Object.freeze({ continente: 'Portugal Continental', ilhas: 'Madeira e Açores', espanha: 'Espanha (exceto ilhas)' });

/* Os campos de um artigo, PELA ORDEM DO FORMULÁRIO. Uma chave nova entra por esta
   ordem (ordenarComo()); as que já estão no ficheiro ficam onde estão. */
export const CAMPOS_ARTIGO = Object.freeze([
  'nome', 'nomeCurto', 'fotos', 'resumo', 'descricao',
  'preco', 'precoAnterior', 'promocaoAte',
  'medidas', 'montagem', 'personalizacao', 'complementos', 'envio', 'vendaIsolada', 'video',
  'categoria', 'maisVendido', 'novidade', 'publicado', 'ordem',
]);
/* Sempre escritos pelo painel, com o valor explícito. Ausentes valem o valor por
   omissão (é o que o gerador faz). */
export const BOOLEANOS_ARTIGO = Object.freeze(['vendaIsolada', 'maisVendido', 'novidade', 'publicado']);
export const POR_OMISSAO = Object.freeze({ publicado: true, maisVendido: false, novidade: false, vendaIsolada: true, ordem: 500 });

export const NOMES_CAMPOS = Object.freeze({
  nome: 'Nome do artigo', nomeCurto: 'Nome curto', fotos: 'Fotografias', resumo: 'Frase curta', descricao: 'Descrição',
  preco: 'Preço', precoAnterior: 'Preço anterior', promocaoAte: 'Fim da promoção',
  medidas: 'Medidas', montagem: 'Como segue', personalizacao: 'Personalização', complementos: 'Complementos',
  envio: 'Portes de envio', vendaIsolada: 'Vende-se sozinho', video: 'Vídeo',
  categoria: 'Categoria', maisVendido: 'Mais vendido', novidade: 'Novidade', publicado: 'Publicado no site', ordem: 'Posição na lista',
});

/* ------------------------------------------------------------------ */
/* Limites                                                             */
/* ------------------------------------------------------------------ */

/* Os números: [mínimo, máximo]. */
export const LIMITES = Object.freeze({ preco: [0.01, 100000], portes: [0, 10000], ordem: [0, 9999] });
/* Tamanhos máximos dos textos, em caracteres. */
export const TAMANHOS = Object.freeze({
  nome: 120, nomeCurto: 40, resumo: 300, descricao: 6000, montagem: 200,
  medidaRotulo: 40, medidaValor: 60, medidas: 12, complementos: 6, fotos: 16, nomeFoto: 120, alt: 300,
  marca: 60, descricaoSite: 300, assinatura: 80, fundadores: 80, email: 160, telefone: 20, rede: 60, horario: 120,
  empresaNome: 160, empresaTipo: 80, nif: 20, morada: 160, codigoPostal: 12, localidade: 60, concelho: 60, iva: 200,
  avisoTexto: 140, ligacao: 200, prazo: 400, pagamento: 400, levantamento: 300, notaVarios: 300,
  catNome: 40, catTitulo: 80, catResumo: 300,
  inicioCurto: 60, inicioTitulo: 120, inicioTexto: 600, inicioLista: 8,
});
/* O que o Worker do painel aceita gravar (recusa acima); aqui só se lembra, a
   partir de 80 %. */
export const TECTOS = Object.freeze({ artigoBytes: 64 * 1024, siteBytes: 64 * 1024, aviso: 0.8 });

/* As palavras que a lei só deixa usar com prova (Diretiva (UE) 2024/825,
   aplicável desde 27 set 2026: alegações ambientais genéricas) e as
   certificações que a Pokóto não nos mostrou (CE, EN 71, FSC). */
export const RE_ALEGACOES = /\b(ecol[óo]gic[oa]s?|sustent[áa]ve(l|is)|sustentabilidade|amig[oa]s? do ambiente|eco-?friendly|biodegrad[áa]ve(l|is)|neutr[oa]s? em carbono|certificad[oa]s?|FSC|EN ?71|marca[çc][ãa]o CE)\b/i;

/* ------------------------------------------------------------------ */
/* Ajudantes que o painel e o Worker também usam                      */
/* ------------------------------------------------------------------ */

const eObjecto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const ausente = (x) => x === null || x === undefined;
const vazio = (x) => ausente(x) || (typeof x === 'string' && x.trim() === '') || (Array.isArray(x) && x.length === 0);
const temTexto = (x) => typeof x === 'string' && x.trim() !== '';
const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const duasCasas = (n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
const bytesDe = (s) => new TextEncoder().encode(s).length;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
export const dataValida = (s) => {
  if (typeof s !== 'string' || !RE_DATA.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  const x = new Date(Date.UTC(a, m - 1, d));
  return x.getUTCFullYear() === a && x.getUTCMonth() === m - 1 && x.getUTCDate() === d;
};

export const terminacaoDe = (texto) => (typeof texto === 'string' && texto.endsWith('\n') ? '\n' : '');
/* Como os ficheiros estão escritos: 2 espaços e a terminação de cada um (todos
   com \n no fim). Abrir e gravar sem mexer deixa o ficheiro igual, byte a byte. */
export function serializar(obj, terminacao = '\n') { return JSON.stringify(obj, null, 2) + (terminacao || ''); }

/* O endereço da página, a partir do nome do ficheiro — IGUAL ao do gerador, que
   usa o nome tal e qual. */
export const slugDoFicheiro = (nome) => String(nome).replace(/\.json$/, '');
const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugValido = (s) => typeof s === 'string' && s.length <= 100 && RE_SLUG.test(s);

/* NIF português: 9 algarismos (com ou sem espaços), o primeiro nunca é 0, e o de
   controlo (módulo 11). */
export function nifValido(nif) {
  const s = String(nif ?? '').replace(/\s/g, '');
  if (!/^[1-9][0-9]{8}$/.test(s)) return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(s[i]) * (9 - i);
  const resto = soma % 11;
  return (resto < 2 ? 0 : 11 - resto) === Number(s[8]);
}

/* O SLUG DE UM ARTIGO NOVO: gerado UMA vez, ao criar, a partir do nome, e nunca
   mais muda — é o endereço da página que a loja partilha no WhatsApp e no
   Instagram. Minúsculas, sem acentos, o resto passa a hífen («Torre/Mesa» →
   torre-mesa). Repetido: -2, -3… */
export function gerarSlug(nome, existentes = []) {
  const ja = existentes instanceof Set ? existentes : new Set(existentes);
  let base = String(ausente(nome) ? '' : nome)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 80).replace(/-+$/, '');
  if (!base) base = 'artigo';
  let slug = base;
  for (let n = 2; ja.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/* O NOME DE UMA FOTOGRAFIA: o do ficheiro em media/fotos/, sem «.jpg». Só
   minúsculas, algarismos e hífens (um espaço num nome parte o srcset — memória
   srcset-nome-com-espaco). */
export const nomeDeFotoValido = (n) => typeof n === 'string' && n.length <= TAMANHOS.nomeFoto && RE_SLUG.test(n);

/* Caracteres de controlo, por escape e nunca literais no código. */
const RE_CONTROLO_LINHA = /[\u0000-\u001F\u007F]/;
const RE_CONTROLO_TEXTO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
/* «</script» e «<!--»: dentro de um <script> do JSON-LD, um fecha o elemento a
   meio e o outro muda a forma como o browser o lê. Não há texto honesto que os
   precise. */
const RE_PARTE_A_PAGINA = /<\/script|<!--/i;

export const RE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const emailValido = (v) => typeof v === 'string' && v.length <= TAMANHOS.email && RE_EMAIL.test(v.trim());

/* Um número português de 9 algarismos, ou com o indicativo (+351, 00351, 351).
   → os 9 algarismos, ou null. O WhatsApp das encomendas é um telemóvel. */
export function numeroPortugues(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  let d = String(v).replace(/[\s.-]/g, '');
  if (d.startsWith('+351')) d = d.slice(4); else if (d.startsWith('00351')) d = d.slice(5); else if (/^351\d{9}$/.test(d)) d = d.slice(3);
  return /^[29]\d{8}$/.test(d) ? d : null;
}
export const eTelemovel = (v) => /^9[1236]\d{7}$/.test(numeroPortugues(v) ?? '');

/* O preço que vale num dia («AAAA-MM-DD», em Lisboa). «preco» é o preço de venda
   (o da promoção, quando há uma) e «precoAnterior» o normal. Acabada a promoção,
   volta o preço normal. A MESMA regra está no carrinho do site
   (src/scripts/carrinho.js, precoDe): o site e o carrinho nunca discordam. */
export function precoDe(p, hoje) {
  const emPromocao = Boolean(p.precoAnterior) && p.precoAnterior > p.preco && (!p.promocaoAte || hoje <= p.promocaoAte);
  if (emPromocao) return { atual: p.preco, anterior: p.precoAnterior, ate: p.promocaoAte || '' };
  if (p.precoAnterior && p.promocaoAte && hoje > p.promocaoAte) return { atual: p.precoAnterior, anterior: null, ate: '' };
  return { atual: p.preco, anterior: null, ate: '' };
}

/* Igualdade de valores lidos de JSON, com null ≡ ausente e sem ligar à ordem
   das chaves. */
export function mesmoValor(a, b) {
  if (ausente(a) && ausente(b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => mesmoValor(x, b[i]));
  }
  if (eObjecto(a) || eObjecto(b)) {
    if (!eObjecto(a) || !eObjecto(b)) return false;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!mesmoValor(a[k], b[k])) return false;
    return true;
  }
  return a === b;
}

/* Os textos de um valor (em profundidade), com o caminho de cada um. */
function textosDe(v, caminho = '') {
  if (typeof v === 'string') return [[caminho, v]];
  const filhos = Array.isArray(v) ? Array.from(v, (x, i) => [i, x]) : eObjecto(v) ? Object.entries(v) : [];
  return filhos.flatMap(([k, x]) => textosDe(x, caminho ? `${caminho}.${k}` : String(k)));
}

/* Lê um ficheiro: o TEXTO (string), o objecto já lido, ou null/undefined. */
function lerJson(valor) {
  if (ausente(valor)) return { ausente: true };
  if (typeof valor !== 'string') return { obj: valor, texto: null };
  try { return { obj: JSON.parse(valor), texto: valor }; } catch (e) { return { ilegivel: String((e && e.message) || e).slice(0, 120), texto: valor }; }
}

/* As categorias de content/categorias.json: [{ slug, nome }], ou null se não se lê. */
export function categoriasDe(valor) {
  const l = lerJson(valor);
  if (!Array.isArray(l.obj)) return null;
  return l.obj.filter((c) => eObjecto(c) && temTexto(c.slug)).map((c) => ({ slug: c.slug, nome: temTexto(c.nome) ? c.nome.trim() : c.slug }));
}

/* As fotografias que existem para o site: as que têm ficheiro em media/fotos/ E
   entrada em content/fotos.json (o gerador precisa das duas: o ficheiro para as
   versões web, a entrada para o texto alternativo). → Set de nomes, ou null se
   não se sabe (sem a lista dos ficheiros). */
export function fotosQueExistem(dados) {
  const d = eObjecto(dados) ? dados : {};
  if (!Array.isArray(d.ficheirosFotos)) return null;
  const f = lerJson(d.fotos);
  const meta = eObjecto(f.obj) ? f.obj : {};
  return new Set(d.ficheirosFotos.filter((n) => eObjecto(meta[n])));
}

/* ------------------------------------------------------------------ */
/* Um artigo                                                            */
/* ------------------------------------------------------------------ */

/* No site, como o gerador decide: tudo menos `publicado: false`. */
export const noSite = (a) => eObjecto(a) && a.publicado !== false;
/* O nome que o ecrã mostra, numa linha só, cortado a 80. */
export const nomeDoArtigo = (a, slug) => {
  const n = eObjecto(a) && temTexto(a.nome) ? a.nome.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const curto = n.length > 80 ? `${n.slice(0, 79)}…` : n;
  return curto || slug || 'artigo sem nome';
};
const ecraDoArtigo = (a, slug) => `Artigos › ${nomeDoArtigo(a, slug)}`;

/* Os problemas de UM artigo. O painel usa-o campo a campo.
   ctx = { nome, categorias?: [slug] | null, fotos?: Set | null (as que existem),
           artigos?: { <slug>: objecto } (para os complementos), videos?: [nome] | null,
           hoje?: 'AAAA-MM-DD' }
   O que falta no ctx não se confere. */
export function problemasDoArtigo(a, ctx = {}) {
  const nome = typeof ctx.nome === 'string' ? ctx.nome : '';
  const slug = slugDoFicheiro(nome);
  const ficheiro = ficheiroDoArtigo(nome);
  const categorias = Array.isArray(ctx.categorias) ? ctx.categorias : null;
  const fotosExistem = ctx.fotos instanceof Set ? ctx.fotos : null;
  const outros = eObjecto(ctx.artigos) ? ctx.artigos : null;
  const videos = Array.isArray(ctx.videos) ? ctx.videos : null;
  const out = [];
  const ecra = ecraDoArtigo(a, slug);
  const base = { ficheiro, ecra, slug };
  const chave = (regra) => `artigo:${slug}:${regra}`;
  const neutraliza = (regra, efeito, campo, mensagem, extra = {}) => out.push({ classe: 'neutraliza', chave: chave(regra), campo, efeito, mensagem, ...base, ...extra });
  const avisa = (regra, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: chave(regra), campo, mensagem, ...base, ...extra });
  const lembra = (regra, campo, mensagem, extra = {}) => avisa(regra, campo, mensagem, { lembrete: true, ...extra });
  if (!eObjecto(a)) return out;   // a forma do ficheiro é do problemas(): bloqueia

  // --- neutraliza: o que o site não pode mostrar --------------------------
  for (const [campo, falta, genero] of [['nome', 'o nome do artigo', 'o'], ['resumo', 'a frase curta', 'a'], ['descricao', 'a descrição', 'a']]) {
    const x = a[campo];
    if (vazio(x)) neutraliza(campo, 'esconder', campo, `Falta ${falta}: o artigo fica escondido do site até estar preenchid${genero}.`);
    else if (typeof x !== 'string') neutraliza(campo, 'esconder', campo, `«${NOMES_CAMPOS[campo]}» tem de ser texto: o artigo fica escondido do site até ser corrigido.`);
  }
  const cat = a.categoria;
  if (vazio(cat)) neutraliza('categoria', 'esconder', 'categoria', 'Falta a categoria: o artigo fica escondido do site até escolher uma.');
  else if (typeof cat !== 'string' || (categorias && !categorias.includes(cat))) neutraliza('categoria', 'esconder', 'categoria', 'A categoria não é nenhuma das do site: o artigo fica escondido até escolher uma da lista.');

  /* O preço: sem ele o cartão e o carrinho não têm o que mostrar. */
  const p = a.preco;
  if (vazio(p)) neutraliza('preco', 'esconder', 'preco', 'Falta o preço: o artigo fica escondido do site até o escrever.');
  else if (typeof p !== 'number' || !Number.isFinite(p) || p < LIMITES.preco[0] || p > LIMITES.preco[1] || !duasCasas(p)) {
    neutraliza('preco', 'esconder', 'preco', 'O preço é só o número, sem € (ex.: 75 ou 74,50): o artigo fica escondido do site até ser corrigido.');
  }

  const partem = [];
  for (const [caminho, t] of textosDe(a)) if (RE_PARTE_A_PAGINA.test(t)) partem.push(caminho.split('.')[0]);
  if (partem.length) {
    const campos = [...new Set(partem)];
    neutraliza('partia-a-pagina', 'esconder', campos[0], `${campos.map((c) => `«${NOMES_CAMPOS[c] || c}»`).join(', ')}: tem «</script» ou «<!--», que não podem ir para o site. O artigo fica escondido do site até isso ser corrigido.`, { campos });
  }
  const alegam = [];
  for (const [caminho, t] of textosDe(a)) { const m = t.match(RE_ALEGACOES); if (m) alegam.push([caminho.split('.')[0], m[0]]); }
  if (alegam.length) {
    neutraliza('alegacoes', 'esconder', alegam[0][0], `«${alegam[0][1]}» é uma palavra que a lei só deixa usar com prova (ou uma certificação que não temos): o artigo fica escondido do site até a tirar.`, { campos: [...new Set(alegam.map((x) => x[0]))] });
  }

  // --- fotografias ---------------------------------------------------------
  const fotos = a.fotos;
  const lista = Array.isArray(fotos) ? fotos : [];
  if (!ausente(fotos) && !Array.isArray(fotos)) avisa('fotos', 'fotos', 'As fotografias não estão gravadas como uma lista. Escolha-as outra vez.');
  const vistos = new Set();
  let boas = 0;
  lista.forEach((f, indice) => {
    const extra = { foto: f, indice };
    if (!nomeDeFotoValido(f)) {
      neutraliza(`foto-invalida:${String(f).slice(0, 80)}`, 'sem_fotografia', 'fotos', `«${String(f).slice(0, 60)}» não é uma fotografia da biblioteca: não aparece no site. Tire-a do artigo e escolha-a outra vez.`, extra);
      return;
    }
    if (vistos.has(f)) { avisa(`foto-repetida:${f}`, 'fotos', 'Há uma fotografia duas vezes no artigo. Tire uma delas.', extra); return; }
    vistos.add(f);
    if (fotosExistem && !fotosExistem.has(f)) {
      neutraliza(`foto-em-falta:${f}`, 'sem_fotografia', 'fotos', 'Uma das fotografias já não está na biblioteca: não aparece no site. Tire-a do artigo, ou carregue-a outra vez.', extra);
      return;
    }
    boas++;
  });
  if (lista.length > TAMANHOS.fotos) avisa('fotos-a-mais', 'fotos', `O artigo tem ${lista.length} fotografias; o máximo é ${TAMANHOS.fotos}. Tire as que estão a mais.`);
  /* Sem nenhuma fotografia boa, o cartão da loja e o cartão de partilha não têm
     imagem: o artigo fica escondido até ter uma. */
  if (!boas) neutraliza('sem-fotos', 'esconder', 'fotos', 'O artigo não tem fotografias: fica escondido do site até ter pelo menos uma (a primeira é a capa).');

  // --- interruptores -----------------------------------------------------------
  for (const b of BOOLEANOS_ARTIGO) {
    if (!ausente(a[b]) && typeof a[b] !== 'boolean') avisa(b, b, `«${NOMES_CAMPOS[b]}» tem de ser sim ou não.`);
  }

  // --- números ----------------------------------------------------------------
  const pa = a.precoAnterior;
  if (!ausente(pa) && pa !== '') {
    if (typeof pa !== 'number' || !Number.isFinite(pa) || !duasCasas(pa) || pa > LIMITES.preco[1]) avisa('precoAnterior', 'precoAnterior', 'O preço anterior é só o número, sem € (ex.: 95).');
    else if (typeof p === 'number' && pa <= p) avisa('precoAnterior', 'precoAnterior', 'O preço anterior tem de ser maior do que o preço de agora (ou fica vazio, sem promoção).');
  }
  const ate = a.promocaoAte;
  if (!ausente(ate) && ate !== '') {
    if (!dataValida(ate)) avisa('promocaoAte', 'promocaoAte', 'A data do fim da promoção não é uma data válida.');
    else if (vazio(pa)) avisa('promocaoAte', 'promocaoAte', 'Há data de fim da promoção, mas não há preço anterior: escreva o preço anterior, ou apague a data.');
    else if (typeof ctx.hoje === 'string' && ate < ctx.hoje && noSite(a)) lembra('promocao-acabou', 'promocaoAte', `A promoção acabou a ${ate.split('-').reverse().join('/')}: o site já mostra o preço normal (${pa} €). Pode apagar o preço anterior e a data, ou pôr uma data nova.`);
  }
  const o = a.ordem;
  if (!ausente(o) && o !== '' && (typeof o !== 'number' || !Number.isInteger(o) || o < LIMITES.ordem[0] || o > LIMITES.ordem[1])) {
    avisa('ordem', 'ordem', `A posição é um número inteiro de 0 a ${LIMITES.ordem[1]} (mais baixo aparece primeiro).`);
  }

  // --- portes ----------------------------------------------------------------
  const portes = (v, campo, onde) => {
    if (ausente(v) || v === '') return 'vazio';
    if (typeof v !== 'number' || !Number.isFinite(v) || v < LIMITES.portes[0] || v > LIMITES.portes[1] || !duasCasas(v)) {
      avisa(`${campo}`, campo, `${onde}: os portes são só o número, sem € (ex.: 15), ou ficam vazios («a confirmar»).`);
      return 'mau';
    }
    return 'ok';
  };
  if (a.vendaIsolada !== false) {
    const e = a.envio;
    if (!ausente(e) && !eObjecto(e)) avisa('envio', 'envio', 'Os portes não estão gravados como deve ser. Escreva-os outra vez.');
    else {
      const faltam = ZONAS_ENVIO.filter((z) => portes(eObjecto(e) ? e[z] : null, `envio.${z}`, `Portes para ${NOMES_ZONAS[z]}`) === 'vazio');
      if (faltam.length && noSite(a)) lembra('portes-por-preencher', `envio.${faltam[0]}`, `Faltam os portes para ${faltam.map((z) => NOMES_ZONAS[z]).join(', ')}: no carrinho aparece «a confirmar».`);
    }
  }

  // --- medidas, personalização, complementos, vídeo ----------------------------
  const m = a.medidas;
  if (!ausente(m)) {
    if (!Array.isArray(m)) avisa('medidas', 'medidas', 'As medidas não estão gravadas como uma lista. Escreva-as outra vez.');
    else {
      if (m.length > TAMANHOS.medidas) avisa('medidas:quantas', 'medidas', `Há ${m.length} linhas de medidas; o máximo é ${TAMANHOS.medidas}.`);
      m.forEach((l, i) => {
        if (!eObjecto(l) || typeof l.rotulo !== 'string' || typeof l.valor !== 'string') { avisa(`medidas.${i}`, 'medidas', `A linha ${i + 1} das medidas não está como deve ser: escreva-a outra vez.`); return; }
        if (!temTexto(l.rotulo) || !temTexto(l.valor)) avisa(`medidas.${i}:vazia`, 'medidas', `A linha ${i + 1} das medidas está incompleta: escreva o nome (ex.: Altura) e a medida (ex.: 90 cm), ou tire a linha.`);
        if (l.rotulo.length > TAMANHOS.medidaRotulo || l.valor.length > TAMANHOS.medidaValor) avisa(`medidas.${i}:tamanho`, 'medidas', `A linha ${i + 1} das medidas é comprida de mais.`);
      });
    }
  }
  const pers = a.personalizacao;
  if (!ausente(pers)) {
    if (!eObjecto(pers) || (!ausente(pers.disponivel) && typeof pers.disponivel !== 'boolean') || (!ausente(pers.obrigatoria) && typeof pers.obrigatoria !== 'boolean')) {
      avisa('personalizacao', 'personalizacao', 'A personalização não está gravada como deve ser: ligue ou desligue outra vez.');
    }
  }
  const comps = a.complementos;
  if (!ausente(comps)) {
    if (!Array.isArray(comps)) avisa('complementos', 'complementos', 'Os complementos não estão gravados como uma lista. Escolha-os outra vez.');
    else {
      if (comps.length > TAMANHOS.complementos) avisa('complementos:quantos', 'complementos', `O máximo são ${TAMANHOS.complementos} complementos.`);
      const vistosC = new Set();
      comps.forEach((k, i) => {
        if (!eObjecto(k) || typeof k.produto !== 'string') { avisa(`complementos.${i}`, 'complementos', `O complemento ${i + 1} não está como deve ser: escolha-o outra vez.`); return; }
        if (k.produto === slug) avisa(`complementos.${i}:proprio`, 'complementos', 'Um artigo não pode ser complemento de si próprio.');
        else if (vistosC.has(k.produto)) avisa(`complementos.${i}:repetido`, 'complementos', 'Há um complemento escolhido duas vezes.');
        else if (outros && !eObjecto(outros[k.produto])) avisa(`complementos.${i}:nao-existe`, 'complementos', `O complemento «${k.produto}» já não existe: tire-o da lista.`);
        vistosC.add(k.produto);
        if (!ausente(k.envioExtra) && !eObjecto(k.envioExtra)) avisa(`complementos.${i}:portes`, 'complementos', `Os portes a mais do complemento ${i + 1} não estão como deve ser.`);
        else for (const z of ZONAS_ENVIO) portes(eObjecto(k.envioExtra) ? k.envioExtra[z] : null, `complementos.${i}.envioExtra.${z}`, `Portes a mais do complemento ${i + 1} para ${NOMES_ZONAS[z]}`);
      });
    }
  }
  const v = a.video;
  if (!ausente(v) && v !== '' && (typeof v !== 'string' || (videos && !videos.includes(v)))) avisa('video', 'video', 'O vídeo escolhido não existe: escolha outro, ou nenhum.');

  // --- textos -------------------------------------------------------------
  const texto = (campo, max, { linha = true } = {}) => {
    const x = a[campo];
    if (ausente(x) || typeof x !== 'string') return;
    if (x.length > max) avisa(`${campo}:tamanho`, campo, `«${NOMES_CAMPOS[campo]}» tem mais de ${max} caracteres (tem ${x.length}).`);
    if ((linha ? RE_CONTROLO_LINHA : RE_CONTROLO_TEXTO).test(x)) avisa(`${campo}:controlo`, campo, `«${NOMES_CAMPOS[campo]}» tem caracteres invisíveis${linha ? ' (ex.: uma mudança de linha)' : ''}. Escreva-o outra vez.`);
  };
  texto('nome', TAMANHOS.nome);
  texto('nomeCurto', TAMANHOS.nomeCurto);
  texto('resumo', TAMANHOS.resumo, { linha: false });
  texto('descricao', TAMANHOS.descricao, { linha: false });
  texto('montagem', TAMANHOS.montagem);
  return out;
}

/* Os problemas que dependem de VÁRIOS artigos: uma peça que só se vende como
   complemento e que nenhum artigo publicado oferece fica sem maneira de se
   encomendar. → [problema] */
function problemasEntreArtigos(objs) {
  const out = [];
  for (const [slug, a] of Object.entries(objs)) {
    if (!eObjecto(a) || a.vendaIsolada !== false || !noSite(a)) continue;
    const oferecido = Object.values(objs).some((x) => noSite(x) && x.vendaIsolada !== false && Array.isArray(x.complementos) && x.complementos.some((k) => eObjecto(k) && k.produto === slug));
    if (!oferecido) {
      out.push({ classe: 'avisa', lembrete: true, chave: `artigo:${slug}:complemento-sem-artigo`, ficheiro: ficheiroDoArtigo(slug), ecra: ecraDoArtigo(a, slug), slug, campo: 'vendaIsolada',
        mensagem: 'Este artigo só se vende como complemento, mas nenhum artigo publicado o oferece: no site não há como o encomendar. Junte-o como complemento de um artigo, ou ligue «Vende-se sozinho».' });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* content/site.json                                                   */
/* ------------------------------------------------------------------ */

export const SECCOES_SITE = Object.freeze({ contactos: 'Contactos', aviso: 'Aviso do topo', entrega: 'Entrega e pagamento', empresa: 'Dados legais', marca: 'A marca' });
/* O que o painel nunca muda: a marca (o nome comercial, nos textos legais e no
   Google) e as zonas de entrega (as chaves dos portes de todos os artigos). */
export const BLOQUEADOS_SITE = Object.freeze(['marca', 'entrega.zonas', 'local']);

export function problemasDoSite(d, { producao = false } = {}) {
  const ficheiro = FICHEIROS.site;
  const out = [];
  const ecraDe = (s) => `Dados da loja › ${SECCOES_SITE[s] || s}`;
  const bloqueia = (chave, s, campo, mensagem) => out.push({ classe: 'bloqueia', chave: `site:${chave}`, ficheiro, ecra: ecraDe(s), campo, mensagem });
  const avisa = (chave, s, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: `site:${chave}`, ficheiro, ecra: ecraDe(s), campo, mensagem, ...extra });
  const legal = (chave, s, campo, mensagem) => (producao ? bloqueia(`${chave}:producao`, s, campo, mensagem) : avisa(chave, s, campo, mensagem, { lembrete: true }));
  if (!eObjecto(d)) { bloqueia('forma', 'marca', undefined, 'Os dados da loja não têm a forma certa. Só o Renato os pode corrigir.'); return out; }

  if (!temTexto(d.marca)) bloqueia('marca', 'marca', 'marca', 'Falta o nome da marca. Só o Renato o pode repor.');
  for (const s of ['contactos', 'empresa', 'entrega', 'local']) {
    if (!eObjecto(d[s])) bloqueia(`${s}:forma`, s, s, `A secção «${SECCOES_SITE[s] || s}» não está gravada, e sem ela o site não se consegue gerar. Só o Renato a pode repor.`);
  }
  const c = eObjecto(d.contactos) ? d.contactos : {};
  const e = eObjecto(d.empresa) ? d.empresa : {};
  /* A localidade e o distrito da oficina aparecem em quase todas as páginas. */
  if (eObjecto(d.local) && (!temTexto(d.local.localidade) || !temTexto(d.local.distrito))) bloqueia('local', 'marca', 'local', 'Falta a localidade ou o distrito da oficina. Só o Renato os pode repor.');
  const en = eObjecto(d.entrega) ? d.entrega : {};

  /* Textos simples: tamanho, caracteres invisíveis, «</script», alegações. */
  const textoSimples = (v, chave, s, campo, rotulo, max, { linha = true } = {}) => {
    if (ausente(v)) return;
    if (typeof v !== 'string') { avisa(`${chave}:tipo`, s, campo, `«${rotulo}» tem de ser texto.`); return; }
    if (v.length > max) avisa(`${chave}:tamanho`, s, campo, `«${rotulo}» tem mais de ${max} caracteres (tem ${v.length}).`);
    if ((linha ? RE_CONTROLO_LINHA : RE_CONTROLO_TEXTO).test(v)) avisa(`${chave}:controlo`, s, campo, `«${rotulo}» tem caracteres invisíveis. Escreva-o outra vez.`);
    if (RE_PARTE_A_PAGINA.test(v)) bloqueia(`${chave}:parte`, s, campo, `«${rotulo}» tem «</script» ou «<!--», que não podem ir para o site.`);
    const m = v.match(RE_ALEGACOES);
    if (m) bloqueia(`${chave}:alegacao`, s, campo, `«${rotulo}»: «${m[0]}» é uma palavra que a lei só deixa usar com prova (ou uma certificação que não temos). Tire-a.`);
  };

  // --- contactos ---------------------------------------------------------------
  if (!ausente(c.email) && c.email !== '' && !emailValido(c.email)) bloqueia('contactos.email', 'contactos', 'contactos.email', 'O email não parece estar certo (ex.: pokotowood@sapo.pt).');
  if (vazio(c.email)) bloqueia('contactos.email:vazio', 'contactos', 'contactos.email', 'Falta o email: a lei pede um contacto por escrito no site.');
  if (!vazio(c.whatsapp) && !eTelemovel(c.whatsapp)) bloqueia('contactos.whatsapp', 'contactos', 'contactos.whatsapp', 'O WhatsApp tem de ser um telemóvel português de 9 algarismos (ex.: 916 949 456).');
  if (vazio(c.whatsapp)) legal('contactos.whatsapp:vazio', 'contactos', 'contactos.whatsapp', 'Falta o número de WhatsApp: é para lá que o carrinho manda as encomendas.');
  if (!vazio(c.telefone) && !numeroPortugues(c.telefone)) avisa('contactos.telefone', 'contactos', 'contactos.telefone', 'O telefone tem de ser um número português de 9 algarismos; até lá, a página de contactos não o mostra.');
  for (const [k, rotulo] of [['instagram', 'Instagram'], ['facebook', 'Facebook']]) {
    const v = c[k];
    if (!vazio(v) && (typeof v !== 'string' || !/^[A-Za-z0-9._-]{1,60}$/.test(v))) avisa(`contactos.${k}`, 'contactos', `contactos.${k}`, `${rotulo}: escreva só o nome da conta, sem @ nem endereço (ex.: pokotowood).`);
  }
  textoSimples(c.horario, 'contactos.horario', 'contactos', 'contactos.horario', 'Horário', TAMANHOS.horario);

  // --- empresa (os dados que a lei pede) ----------------------------------------
  if (vazio(e.nome)) legal('empresa.nome:vazio', 'empresa', 'empresa.nome', 'Falta o nome da empresa ou do empresário em nome individual (a lei pede-o no site).');
  if (!vazio(e.nif) && !nifValido(e.nif)) bloqueia('empresa.nif', 'empresa', 'empresa.nif', 'O NIF não é um NIF português válido: confira os 9 algarismos.');
  if (vazio(e.nif)) legal('empresa.nif:vazio', 'empresa', 'empresa.nif', 'Falta o NIF (a lei pede-o no site).');
  if (vazio(e.morada) || vazio(e.codigoPostal)) legal('empresa.morada:vazio', 'empresa', vazio(e.morada) ? 'empresa.morada' : 'empresa.codigoPostal', 'Falta a morada da sede, com o código postal (a lei pede-a no site).');
  if (!vazio(e.codigoPostal) && !/^\d{4}-\d{3}$/.test(String(e.codigoPostal).trim())) avisa('empresa.codigoPostal', 'empresa', 'empresa.codigoPostal', 'O código postal tem a forma 4770-465.');
  if (vazio(e.iva)) legal('empresa.iva:vazio', 'empresa', 'empresa.iva', 'Falta dizer se os preços incluem IVA ou se está isento (art. 53.º do CIVA): os termos dizem-no ao cliente.');
  for (const [k, max, rotulo] of [['nome', TAMANHOS.empresaNome, 'Nome'], ['tipo', TAMANHOS.empresaTipo, 'Tipo'], ['morada', TAMANHOS.morada, 'Morada'], ['localidade', TAMANHOS.localidade, 'Localidade'], ['concelho', TAMANHOS.concelho, 'Concelho'], ['iva', TAMANHOS.iva, 'IVA']]) {
    textoSimples(e[k], `empresa.${k}`, 'empresa', `empresa.${k}`, rotulo, max);
  }

  // --- aviso do topo ------------------------------------------------------------
  const av = d.aviso;
  if (!ausente(av)) {
    if (!eObjecto(av)) avisa('aviso:forma', 'aviso', 'aviso', 'O aviso do topo não está gravado como deve ser: escreva-o outra vez.');
    else {
      textoSimples(av.texto, 'aviso.texto', 'aviso', 'aviso.texto', 'Texto do aviso', TAMANHOS.avisoTexto);
      if (!vazio(av.ate) && !dataValida(av.ate)) avisa('aviso.ate', 'aviso', 'aviso.ate', 'A data até quando o aviso aparece não é uma data válida.');
      if (!vazio(av.ligacao) && (typeof av.ligacao !== 'string' || !/^\/[a-z0-9/-]*$/.test(av.ligacao))) avisa('aviso.ligacao', 'aviso', 'aviso.ligacao', 'A ligação do aviso tem de ser uma página do site (ex.: /loja/).');
    }
  }

  // --- entrega -------------------------------------------------------------------
  const zonas = en.zonas;
  if (!Array.isArray(zonas) || !zonas.some((z) => eObjecto(z) && z.id === 'levantamento') || !ZONAS_ENVIO.every((id) => zonas.some((z) => eObjecto(z) && z.id === id && temTexto(z.nome) && temTexto(z.curto)))) {
    bloqueia('entrega.zonas', 'entrega', 'entrega.zonas', 'As zonas de entrega não estão como deviam. Só o Renato as pode corrigir.');
  }
  if (vazio(en.prazo)) legal('entrega.prazo:vazio', 'entrega', 'entrega.prazo', 'Falta o prazo de produção e entrega: a lei pede que o cliente o saiba antes de encomendar.');
  if (vazio(en.pagamento)) legal('entrega.pagamento:vazio', 'entrega', 'entrega.pagamento', 'Faltam as formas de pagamento: a lei pede que o cliente as saiba antes de encomendar.');
  textoSimples(en.prazo, 'entrega.prazo', 'entrega', 'entrega.prazo', 'Prazo', TAMANHOS.prazo, { linha: false });
  textoSimples(en.pagamento, 'entrega.pagamento', 'entrega', 'entrega.pagamento', 'Pagamento', TAMANHOS.pagamento, { linha: false });
  textoSimples(en.levantamento, 'entrega.levantamento', 'entrega', 'entrega.levantamento', 'Levantamento', TAMANHOS.levantamento, { linha: false });
  textoSimples(en.notaVariosArtigos, 'entrega.notaVariosArtigos', 'entrega', 'entrega.notaVariosArtigos', 'Nota dos portes de vários artigos', TAMANHOS.notaVarios, { linha: false });

  // --- a marca ----------------------------------------------------------------------
  textoSimples(d.descricao, 'descricao', 'marca', 'descricao', 'Descrição da marca', TAMANHOS.descricaoSite, { linha: false });
  textoSimples(d.assinatura, 'assinatura', 'marca', 'assinatura', 'Assinatura do rodapé', TAMANHOS.assinatura);
  textoSimples(d.fundadores, 'fundadores', 'marca', 'fundadores', 'Quem faz', TAMANHOS.fundadores);
  return out;
}

/* ------------------------------------------------------------------ */
/* content/categorias.json                                             */
/* ------------------------------------------------------------------ */

export function problemasDasCategorias(valor, { fotos = null } = {}) {
  const ficheiro = FICHEIROS.categorias;
  const out = [];
  const bloqueia = (chave, campo, mensagem) => out.push({ classe: 'bloqueia', chave: `categorias:${chave}`, ficheiro, ecra: 'Categorias', campo, mensagem });
  const avisa = (chave, campo, mensagem) => out.push({ classe: 'avisa', chave: `categorias:${chave}`, ficheiro, ecra: 'Categorias', campo, mensagem });
  const l = lerJson(valor);
  if (!Array.isArray(l.obj) || !l.obj.length) { bloqueia('forma', undefined, 'As categorias não se conseguem ler: sem elas o site não se consegue gerar. Só o Renato as pode corrigir.'); return out; }
  const slugs = new Set();
  l.obj.forEach((c, i) => {
    if (!eObjecto(c) || !slugValido(c.slug)) { bloqueia(`${i}:forma`, `${i}`, `A categoria ${i + 1} não tem a forma certa. Só o Renato a pode corrigir.`); return; }
    if (slugs.has(c.slug)) bloqueia(`${c.slug}:repetida`, `${i}`, `A categoria «${c.slug}» está repetida. Só o Renato a pode corrigir.`);
    slugs.add(c.slug);
    for (const [k, max, rotulo, obrigatorio] of [['nome', TAMANHOS.catNome, 'Nome', true], ['nomeMenu', TAMANHOS.catNome, 'Nome no menu', false], ['titulo', TAMANHOS.catTitulo, 'Título da página', true], ['resumo', TAMANHOS.catResumo, 'Texto da página', true]]) {
      const v = c[k];
      if (vazio(v)) { if (obrigatorio) bloqueia(`${c.slug}.${k}:vazio`, `${i}.${k}`, `«${rotulo}» da categoria ${c.nome || c.slug} está vazio.`); continue; }
      if (typeof v !== 'string') { bloqueia(`${c.slug}.${k}:tipo`, `${i}.${k}`, `«${rotulo}» da categoria ${c.slug} tem de ser texto.`); continue; }
      if (v.length > max) avisa(`${c.slug}.${k}:tamanho`, `${i}.${k}`, `«${rotulo}» da categoria ${c.nome || c.slug} tem mais de ${max} caracteres.`);
      if (RE_CONTROLO_TEXTO.test(v) || RE_PARTE_A_PAGINA.test(v)) bloqueia(`${c.slug}.${k}:controlo`, `${i}.${k}`, `«${rotulo}» da categoria ${c.nome || c.slug} tem caracteres que não podem ir para o site.`);
      const m = v.match(RE_ALEGACOES);
      if (m) bloqueia(`${c.slug}.${k}:alegacao`, `${i}.${k}`, `«${rotulo}» da categoria ${c.nome || c.slug}: «${m[0]}» é uma palavra que a lei só deixa usar com prova. Tire-a.`);
    }
    if (!nomeDeFotoValido(c.foto) || (fotos && !fotos.has(c.foto))) bloqueia(`${c.slug}.foto`, `${i}.foto`, `A fotografia da categoria ${c.nome || c.slug} não existe na biblioteca: escolha outra.`);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* content/inicio.json                                                 */
/* ------------------------------------------------------------------ */

/* As fotografias que a página inicial usa (para saber se uma se pode apagar). */
export function fotosDoInicio(h) {
  if (!eObjecto(h)) return [];
  const out = [];
  if (eObjecto(h.capa)) out.push(h.capa.foto);
  if (eObjecto(h.personalizacao)) out.push(h.personalizacao.foto);
  if (eObjecto(h.emCasa) && Array.isArray(h.emCasa.fotos)) for (const f of h.emCasa.fotos) if (eObjecto(f)) out.push(f.foto);
  if (eObjecto(h.instagram) && Array.isArray(h.instagram.fotos)) out.push(...h.instagram.fotos);
  return out.filter((x) => typeof x === 'string');
}

export function problemasDoInicio(valor, { fotos = null, artigos = null, videos = null } = {}) {
  const ficheiro = FICHEIROS.inicio;
  const out = [];
  const ecra = 'Página inicial';
  const bloqueia = (chave, campo, mensagem) => out.push({ classe: 'bloqueia', chave: `inicio:${chave}`, ficheiro, ecra, campo, mensagem });
  const avisa = (chave, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: `inicio:${chave}`, ficheiro, ecra, campo, mensagem, ...extra });
  const l = lerJson(valor);
  if (l.ilegivel || !eObjecto(l.obj)) { bloqueia('forma', undefined, 'A página inicial não se consegue ler. Só o Renato a pode corrigir.'); return out; }
  const h = l.obj;
  const seccao = (k) => (eObjecto(h[k]) ? h[k] : null);
  for (const k of ['seo', 'capa', 'vitrine', 'categorias', 'personalizacao', 'historia', 'emCasa', 'oficina', 'comoEncomendar', 'instagram']) {
    if (!seccao(k)) bloqueia(`${k}:forma`, k, `A secção «${k}» da página inicial não está gravada. Só o Renato a pode repor.`);
  }
  if (out.length) return out;
  /* Os textos todos: obrigatórios onde o gerador os escreve sem perguntar. */
  const textos = [
    ['seo.titulo', TAMANHOS.inicioTitulo, true], ['seo.descricao', TAMANHOS.inicioTexto, true],
    ['capa.etiqueta', TAMANHOS.inicioCurto, true], ['capa.tituloLinha1', TAMANHOS.inicioCurto, true], ['capa.tituloLinha2', TAMANHOS.inicioCurto, true], ['capa.texto', TAMANHOS.inicioTexto, true], ['capa.botao', TAMANHOS.inicioCurto, true],
    ['vitrine.titulo', TAMANHOS.inicioTitulo, true],
    ['categorias.titulo', TAMANHOS.inicioTitulo, true], ['categorias.texto', TAMANHOS.inicioTexto, true],
    ['personalizacao.etiqueta', TAMANHOS.inicioCurto, true], ['personalizacao.titulo', TAMANHOS.inicioTitulo, true], ['personalizacao.texto', TAMANHOS.inicioTexto, true], ['personalizacao.botao', TAMANHOS.inicioCurto, true], ['personalizacao.legenda', TAMANHOS.inicioCurto, true],
    ['historia.etiqueta', TAMANHOS.inicioCurto, true], ['historia.titulo', TAMANHOS.inicioTitulo, true], ['historia.texto', TAMANHOS.inicioTexto, true], ['historia.botao', TAMANHOS.inicioCurto, true],
    ['emCasa.titulo', TAMANHOS.inicioTitulo, true], ['emCasa.texto', TAMANHOS.inicioTexto, true],
    ['oficina.etiqueta', TAMANHOS.inicioCurto, true], ['oficina.titulo', TAMANHOS.inicioTitulo, true], ['oficina.texto', TAMANHOS.inicioTexto, true], ['oficina.botao', TAMANHOS.inicioCurto, true],
    ['comoEncomendar.titulo', TAMANHOS.inicioTitulo, true],
    ['instagram.titulo', TAMANHOS.inicioTitulo, true], ['instagram.texto', TAMANHOS.inicioTexto, true],
  ];
  const valorEm = (caminho) => caminho.split('.').reduce((o, k) => (eObjecto(o) || Array.isArray(o) ? o[k] : undefined), h);
  const umTexto = (caminho, max, obrigatorio) => {
    const v = valorEm(caminho);
    if (vazio(v)) { if (obrigatorio) bloqueia(`${caminho}:vazio`, caminho, 'Este texto da página inicial está vazio: escreva-o.'); return; }
    if (typeof v !== 'string') { bloqueia(`${caminho}:tipo`, caminho, 'Este texto da página inicial não está gravado como texto.'); return; }
    if (v.length > max) avisa(`${caminho}:tamanho`, caminho, `Este texto tem mais de ${max} caracteres (tem ${v.length}).`);
    if (RE_CONTROLO_TEXTO.test(v) || RE_PARTE_A_PAGINA.test(v)) bloqueia(`${caminho}:controlo`, caminho, 'Este texto tem caracteres que não podem ir para o site. Escreva-o outra vez.');
    const m = v.match(RE_ALEGACOES);
    if (m) bloqueia(`${caminho}:alegacao`, caminho, `«${m[0]}» é uma palavra que a lei só deixa usar com prova (ou uma certificação que não temos). Tire-a.`);
  };
  for (const [c, max, ob] of textos) umTexto(c, max, ob);
  if (!vazio(h.capa.ligacao) && (typeof h.capa.ligacao !== 'string' || !/^\/[a-z0-9/-]*$/.test(h.capa.ligacao))) avisa('capa.ligacao', 'capa.ligacao', 'A ligação do botão tem de ser uma página do site (ex.: /loja/).');
  /* As listas de textos curtos. */
  const listaDeTextos = (caminho, min, max) => {
    const v = valorEm(caminho);
    if (!Array.isArray(v) || v.length < min || v.length > max || v.some((x) => !temTexto(x) || x.length > TAMANHOS.inicioCurto)) {
      bloqueia(`${caminho}:lista`, caminho, `Esta lista tem de ter de ${min} a ${max} textos curtos, nenhum vazio.`);
    }
  };
  listaDeTextos('personalizacao.opcoes', 1, 4);
  listaDeTextos('historia.bolhas', 0, 3);
  listaDeTextos('faixa', 2, TAMANHOS.inicioLista);
  /* As listas de blocos (título + texto). */
  const blocos = (caminho, min, max) => {
    const v = valorEm(caminho);
    if (!Array.isArray(v) || v.length < min || v.length > max) { bloqueia(`${caminho}:lista`, caminho, `Esta lista tem de ter de ${min} a ${max} blocos.`); return; }
    v.forEach((b, i) => {
      if (!eObjecto(b)) { bloqueia(`${caminho}.${i}:forma`, `${caminho}.${i}`, `O bloco ${i + 1} não tem a forma certa.`); return; }
      umTexto(`${caminho}.${i}.titulo`, TAMANHOS.inicioCurto, true);
      umTexto(`${caminho}.${i}.texto`, TAMANHOS.inicioTexto, true);
    });
  };
  blocos('vantagens', 2, 6);
  blocos('comoEncomendar.passos', 2, 6);
  /* Os separadores da vitrine: os filtros são do gerador; os nomes, textos curtos. */
  const sep = h.vitrine.separadores;
  const FILTROS = ['todos', 'maisVendido', 'promocao', 'novidade'];
  if (!Array.isArray(sep) || !sep.length || sep.some((s) => !eObjecto(s) || !temTexto(s.nome) || !FILTROS.includes(s.filtro))) bloqueia('vitrine.separadores', 'vitrine.separadores', 'Os separadores da vitrine não estão como deviam. Só o Renato os pode corrigir.');
  else sep.forEach((s, i) => umTexto(`vitrine.separadores.${i}.nome`, TAMANHOS.inicioCurto, true));
  /* Os desenhos das vantagens são os do site (o painel não os muda). */
  const DESENHOS = ['mao', 'gravar', 'pronto', 'local'];
  if (Array.isArray(h.vantagens)) h.vantagens.forEach((v, i) => { if (eObjecto(v) && !DESENHOS.includes(v.icone)) avisa(`vantagens.${i}.icone`, `vantagens.${i}`, `O desenho da vantagem ${i + 1} não é nenhum dos do site: aparece sem desenho. Só o Renato o pode corrigir.`); });
  /* As fotografias. */
  const umaFoto = (caminho, f) => { if (!nomeDeFotoValido(f) || (fotos && !fotos.has(f))) bloqueia(`${caminho}:foto`, caminho, 'Esta fotografia já não está na biblioteca: escolha outra.'); };
  umaFoto('capa.foto', h.capa.foto);
  umaFoto('personalizacao.foto', h.personalizacao.foto);
  const ec = h.emCasa.fotos;
  if (!Array.isArray(ec) || ec.length < 1 || ec.length > 8) bloqueia('emCasa.fotos:lista', 'emCasa.fotos', '«Em casa de quem já tem» tem de ter de 1 a 8 fotografias.');
  else ec.forEach((x, i) => {
    if (!eObjecto(x)) { bloqueia(`emCasa.fotos.${i}:forma`, `emCasa.fotos.${i}`, `A fotografia ${i + 1} não tem a forma certa.`); return; }
    umaFoto(`emCasa.fotos.${i}.foto`, x.foto);
    /* Um artigo escondido não pára nada: o site salta esse cartão (e esconder um artigo nunca
       pode ficar preso por causa da página inicial). Só lembra. */
    if (typeof x.produto !== 'string' || (artigos && !(eObjecto(artigos[x.produto]) && noSite(artigos[x.produto])))) {
      avisa(`emCasa.fotos.${i}.produto`, `emCasa.fotos.${i}.produto`, `A fotografia ${i + 1} de «Em casa de quem já tem» é de um artigo que não está no site: não aparece. Escolha outro artigo, ou tire a fotografia.`, { lembrete: true });
    }
  });
  const ig = h.instagram.fotos;
  if (!Array.isArray(ig) || ig.length < 3 || ig.length > 12) bloqueia('instagram.fotos:lista', 'instagram.fotos', 'O bloco do Instagram tem de ter de 3 a 12 fotografias.');
  else ig.forEach((f, i) => umaFoto(`instagram.fotos.${i}`, f));
  if (vazio(h.oficina.video) || (videos && !videos.includes(h.oficina.video))) bloqueia('oficina.video', 'oficina.video', 'O vídeo da oficina não existe. Só o Renato o pode trocar.');
  return out;
}

/* ------------------------------------------------------------------ */
/* content/fotos.json                                                  */
/* ------------------------------------------------------------------ */

/* Cada fotografia tem o texto alternativo (o que um leitor de ecrã diz, e o que o
   Google lê) e o ponto de foco (onde se corta, em «x% y%»). */
const RE_FOCO = /^(\d{1,3})% (\d{1,3})%$/;
export const focoValido = (f) => { const m = RE_FOCO.exec(String(f ?? '')); return Boolean(m) && Number(m[1]) <= 100 && Number(m[2]) <= 100; };

export function problemasDasFotos(valor, ficheirosFotos = null) {
  const ficheiro = FICHEIROS.fotos;
  const out = [];
  const bloqueia = (chave, campo, mensagem, extra = {}) => out.push({ classe: 'bloqueia', chave: `fotos:${chave}`, ficheiro, ecra: 'Fotografias', campo, mensagem, ...extra });
  const avisa = (chave, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: `fotos:${chave}`, ficheiro, ecra: 'Fotografias', campo, mensagem, ...extra });
  const l = lerJson(valor);
  if (l.ilegivel || !eObjecto(l.obj)) { bloqueia('forma', undefined, 'A lista das fotografias não se consegue ler. Só o Renato a pode corrigir.'); return out; }
  for (const [nome, f] of Object.entries(l.obj)) {
    if (!nomeDeFotoValido(nome)) { bloqueia(`${nome.slice(0, 60)}:nome`, nome, `«${nome.slice(0, 60)}» não é um nome de fotografia válido. Só o Renato o pode corrigir.`); continue; }
    if (!eObjecto(f)) { bloqueia(`${nome}:forma`, nome, `A fotografia «${nome}» não tem a forma certa.`); continue; }
    if (!temTexto(f.alt)) bloqueia(`${nome}:alt`, `${nome}.alt`, 'Uma fotografia não tem descrição (o que um leitor de ecrã diz): escreva-a.', { foto: nome });
    else {
      if (f.alt.length > TAMANHOS.alt) avisa(`${nome}:alt:tamanho`, `${nome}.alt`, `A descrição de uma fotografia tem mais de ${TAMANHOS.alt} caracteres.`, { foto: nome });
      if (RE_CONTROLO_LINHA.test(f.alt) || RE_PARTE_A_PAGINA.test(f.alt)) bloqueia(`${nome}:alt:controlo`, `${nome}.alt`, 'A descrição de uma fotografia tem caracteres que não podem ir para o site.', { foto: nome });
    }
    if (!ausente(f.foco) && !focoValido(f.foco)) avisa(`${nome}:foco`, `${nome}.foco`, 'O ponto de foco de uma fotografia não está como devia.', { foto: nome });
  }
  if (Array.isArray(ficheirosFotos)) {
    for (const n of ficheirosFotos) {
      /* Um ficheiro com um nome que o site não aceita (posto à mão: «Foto 1.jpg»): o painel não lhe
         consegue dar descrição — é do Renato. */
      if (!nomeDeFotoValido(n)) { bloqueia(`${String(n).slice(0, 60)}:nome-do-ficheiro`, undefined, `Há uma fotografia na biblioteca com um nome que o site não aceita («${String(n).slice(0, 60)}»: só minúsculas, algarismos e hífens). Só o Renato a pode corrigir.`, { foto: n }); continue; }
      if (!tem(l.obj, n)) bloqueia(`${n}:sem-entrada`, n, `A fotografia «${n}» não tem descrição: escreva-a.`, { foto: n });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Todos                                                               */
/* ------------------------------------------------------------------ */

/* problemas(dados, opcoes) → [problema]
 *   opcoes: { hoje?: 'AAAA-MM-DD', producao?: boolean } */
export function problemas(dados = {}, opcoes = {}) {
  const lista = [];
  const d = eObjecto(dados) ? dados : {};
  const fotos = fotosQueExistem(d);
  const videos = Array.isArray(d.videos) ? d.videos : null;
  const artigosObj = {};
  if (eObjecto(d.artigos)) for (const [n, v] of Object.entries(d.artigos)) { const l = lerJson(v); if (eObjecto(l.obj)) artigosObj[slugDoFicheiro(n)] = l.obj; }

  const umFicheiro = (k, rotulo, fn) => {
    if (!tem(d, k)) return;
    const l = lerJson(d[k]);
    const ficheiro = FICHEIROS[k];
    if (l.ausente) lista.push({ classe: 'bloqueia', chave: `${k}:ausente`, ficheiro, ecra: rotulo, mensagem: `Falta o ficheiro ${ficheiro}: sem ele o site não se consegue gerar. Só o Renato o pode repor.` });
    else if (l.ilegivel) lista.push({ classe: 'bloqueia', chave: `${k}:ilegivel`, ficheiro, ecra: rotulo, mensagem: `${rotulo}: o ficheiro não se consegue ler (JSON inválido: ${l.ilegivel}). Só o Renato o pode corrigir.` });
    else lista.push(...fn(l.obj));
  };
  umFicheiro('site', 'Dados da loja', (o) => problemasDoSite(o, { producao: Boolean(opcoes.producao) }));
  umFicheiro('fotos', 'Fotografias', (o) => problemasDasFotos(o, Array.isArray(d.ficheirosFotos) ? d.ficheirosFotos : null));
  umFicheiro('categorias', 'Categorias', (o) => problemasDasCategorias(o, { fotos }));
  umFicheiro('inicio', 'Página inicial', (o) => problemasDoInicio(o, { fotos, artigos: tem(d, 'artigos') ? artigosObj : null, videos }));

  let categorias = null;
  if (tem(d, 'categorias')) { const cs = categoriasDe(d.categorias); if (cs) categorias = cs.map((c) => c.slug); }
  const mapa = d.artigos;
  if (eObjecto(mapa)) {
    for (const nome of Object.keys(mapa).sort()) {
      const valor = mapa[nome];
      if (ausente(valor)) continue;
      const slug = slugDoFicheiro(nome);
      const ficheiro = ficheiroDoArtigo(nome);
      const ecra = `Artigos › ${slug}`;
      const base = { ficheiro, slug };
      const l = lerJson(valor);
      if (l.ilegivel) { lista.push({ classe: 'bloqueia', chave: `artigo:${slug}:ilegivel`, ecra, ...base, mensagem: `O ficheiro deste artigo não se consegue ler (JSON inválido: ${l.ilegivel}). Só o Renato o pode corrigir.` }); continue; }
      if (!eObjecto(l.obj)) { lista.push({ classe: 'bloqueia', chave: `artigo:${slug}:forma`, ecra, ...base, mensagem: 'O ficheiro deste artigo não tem a forma de um artigo. Só o Renato o pode corrigir.' }); continue; }
      if (!slugValido(slug)) { lista.push({ classe: 'bloqueia', chave: `artigo:${slug}:endereco`, ecra, ...base, mensagem: `O nome do ficheiro («${nome}») não é um endereço válido (só minúsculas, algarismos e hífenes). Só o Renato o pode corrigir.` }); continue; }
      lista.push(...problemasDoArtigo(l.obj, { nome, categorias, fotos, artigos: artigosObj, videos, hoje: opcoes.hoje }));
      const bytes = l.texto !== null ? bytesDe(l.texto) : bytesDe(serializar(l.obj));
      if (bytes > TECTOS.artigoBytes * TECTOS.aviso) lista.push({ classe: 'avisa', lembrete: true, chave: `artigo:${slug}:tecto`, ecra: ecraDoArtigo(l.obj, slug), ...base, mensagem: `Este artigo está a chegar ao limite do painel (${Math.round(bytes / 1024)} de ${TECTOS.artigoBytes / 1024} KB): encurte a descrição.` });
    }
    lista.push(...problemasEntreArtigos(artigosObj));
  }
  return lista;
}

/* ------------------------------------------------------------------ */
/* A cópia que o gerador lê                                            */
/* ------------------------------------------------------------------ */

/* neutralizar(dados, lista) → { artigos: { <nome>: objecto }, efeitos, mudou }
 *   Os problemas «neutraliza» aplicados a uma CÓPIA dos artigos (o repositório
 *   não muda):
 *     · esconder       — publicado: false (sai do site, como um rascunho);
 *     · sem_fotografia — a fotografia sai da lista.
 *   E, sem problema nenhum: um complemento que aponta para um artigo que não
 *   está no site sai da lista (o carrinho não o pode vender).
 *   efeitos: o que muda NO SITE, por artigo: [{ ficheiro, slug, nome, efeitos, motivos }] */
export function neutralizar(dados = {}, lista = []) {
  const d = eObjecto(dados) ? dados : {};
  const porFicheiro = new Map();
  for (const p of Array.isArray(lista) ? lista : []) {
    if (p && p.classe === 'neutraliza' && typeof p.ficheiro === 'string') porFicheiro.set(p.ficheiro, [...(porFicheiro.get(p.ficheiro) || []), p]);
  }
  const artigos = {};
  const efeitos = [];
  let mudou = false;
  const mapa = eObjecto(d.artigos) ? d.artigos : {};
  for (const nome of Object.keys(mapa).sort()) {
    const l = lerJson(mapa[nome]);
    if (!eObjecto(l.obj)) continue;
    const a = JSON.parse(JSON.stringify(l.obj));
    const prs = porFicheiro.get(ficheiroDoArtigo(nome)) || [];
    const feitos = []; const motivos = [];
    if (prs.some((p) => p.efeito === 'esconder')) {
      if (a.publicado !== false) { a.publicado = false; feitos.push('esconder'); mudou = true; }
      motivos.push(...prs.filter((p) => p.efeito === 'esconder').map((p) => p.mensagem));
    }
    const tirar = new Set(prs.filter((p) => p.efeito === 'sem_fotografia').map((p) => String(p.foto)));
    if (tirar.size && Array.isArray(a.fotos)) {
      a.fotos = a.fotos.filter((f) => !tirar.has(String(f)));
      mudou = true;
      if (!feitos.includes('esconder')) { feitos.push('sem_fotografia'); motivos.push(...prs.filter((p) => p.efeito === 'sem_fotografia').map((p) => p.mensagem)); }
    }
    artigos[nome] = a;
    if (feitos.length) efeitos.push({ ficheiro: ficheiroDoArtigo(nome), slug: slugDoFicheiro(nome), nome: nomeDoArtigo(l.obj, slugDoFicheiro(nome)), efeitos: feitos, motivos });
  }
  /* Os complementos que não se podem vender (o artigo não está no site, ou só
     existe como complemento de outro) saem da lista de quem os oferece. */
  for (const [nome, a] of Object.entries(artigos)) {
    if (!Array.isArray(a.complementos)) continue;
    const antes = a.complementos.length;
    a.complementos = a.complementos.filter((k) => eObjecto(k) && k.produto !== slugDoFicheiro(nome) && eObjecto(artigos[k.produto]) && noSite(artigos[k.produto]));
    if (a.complementos.length !== antes) mudou = true;
  }
  return { artigos, efeitos, mudou };
}

const DESCRICAO_EFEITOS = { esconder: 'escondido do site', sem_fotografia: 'com fotografias que não aparecem' };
export const descreverEfeitos = (e) => e.efeitos.map((x) => DESCRICAO_EFEITOS[x] || x).join(' e ');

/* ------------------------------------------------------------------ */
/* O que o painel não pode mudar ao gravar                             */
/* ------------------------------------------------------------------ */

const valorEmCaminho = (o, caminho) => caminho.split('.').reduce((x, k) => (eObjecto(x) ? x[k] : undefined), o);

/* mudancasBloqueadas(antes, depois, qual) → [{ caminho, motivo }] ([] = pode gravar)
 *   'artigo':     as chaves que não são CAMPOS_ARTIGO não mudam;
 *   'site':       BLOQUEADOS_SITE não mudam, e não aparecem secções novas;
 *   'categorias': as categorias são as mesmas, pela mesma ordem (slug e ícone);
 *   'inicio':     não aparecem nem desaparecem secções, e o vídeo não muda. */
export function mudancasBloqueadas(antes, depois, qual = 'site') {
  const out = [];
  if (qual === 'artigo') {
    const a = eObjecto(antes) ? antes : {}; const d = eObjecto(depois) ? depois : {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) {
      if (CAMPOS_ARTIGO.includes(k) || mesmoValor(a[k], d[k])) continue;
      out.push({ caminho: k, motivo: tem(a, k) ? 'mudou' : 'chave_nova' });
    }
    return out;
  }
  if (qual === 'categorias') {
    const a = Array.isArray(antes) ? antes : []; const d = Array.isArray(depois) ? depois : [];
    if (a.length !== d.length) return [{ caminho: 'categorias', motivo: 'quantas' }];
    a.forEach((c, i) => {
      for (const k of ['slug', 'icone']) if (!mesmoValor(eObjecto(c) ? c[k] : null, eObjecto(d[i]) ? d[i][k] : null)) out.push({ caminho: `${i}.${k}`, motivo: 'mudou' });
    });
    return out;
  }
  const a = eObjecto(antes) ? antes : {}; const d = eObjecto(depois) ? depois : {};
  if (qual === 'inicio') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) if (!tem(a, k) || !tem(d, k)) out.push({ caminho: k, motivo: tem(a, k) ? 'saiu' : 'chave_nova' });
    if (!mesmoValor(valorEmCaminho(a, 'oficina.video'), valorEmCaminho(d, 'oficina.video'))) out.push({ caminho: 'oficina.video', motivo: 'mudou' });
    if (!mesmoValor((valorEmCaminho(a, 'vitrine.separadores') || []).map?.((s) => s?.filtro), (valorEmCaminho(d, 'vitrine.separadores') || []).map?.((s) => s?.filtro))) out.push({ caminho: 'vitrine.separadores', motivo: 'mudou' });
    return out;
  }
  for (const caminho of BLOQUEADOS_SITE) if (!mesmoValor(valorEmCaminho(a, caminho), valorEmCaminho(d, caminho))) out.push({ caminho, motivo: 'mudou' });
  const conhecidas = new Set([...Object.keys(a), ...Object.keys(SECCOES_SITE), 'descricao', 'assinatura', 'fundadores']);
  for (const k of Object.keys(d)) if (!conhecidas.has(k)) out.push({ caminho: k, motivo: 'chave_nova' });
  return out;
}

/* A ORDEM DAS CHAVES AO GRAVAR: as que já estavam no ficheiro ficam onde
   estavam; uma nova entra antes da primeira que, na ordem do formulário, vem
   depois dela (e no fim, se nenhuma vier); as que o formulário não conhece vão
   para o fim. As que saíram, saem. */
export function ordenarComo(antes, depois, ordem = CAMPOS_ARTIGO) {
  if (!eObjecto(depois)) return depois;
  const a = eObjecto(antes) ? antes : {};
  const chaves = Object.keys(a).filter((k) => tem(depois, k));
  const novas = Object.keys(depois).filter((k) => !chaves.includes(k));
  for (const k of novas.filter((x) => ordem.includes(x))) {
    const i = ordem.indexOf(k);
    const j = chaves.findIndex((x) => ordem.includes(x) && ordem.indexOf(x) > i);
    if (j < 0) chaves.push(k); else chaves.splice(j, 0, k);
  }
  chaves.push(...novas.filter((x) => !ordem.includes(x)));
  const out = {};
  for (const k of chaves) out[k] = depois[k];
  return out;
}

/* A fotografia de cada página de texto (content/paginas/*.md): a linha «foto: <nome>»
   do cabeçalho, antes do «---». `paginas`: { <nome>: texto }. → [nome] */
export function fotosDasPaginas(paginas = {}) {
  const out = [];
  for (const t of Object.values(eObjecto(paginas) ? paginas : {})) {
    if (typeof t !== 'string') continue;
    const cabeca = t.split(/\n---\n/)[0];
    const m = /^foto:\s*(\S+)\s*$/m.exec(cabeca);
    if (m) out.push(m[1]);
  }
  return out;
}

/* AS FOTOGRAFIAS EM USO, em todo o conteúdo: as dos artigos, das categorias, da
   página inicial e das páginas de texto (dados.paginas). Uma fotografia só sai da
   biblioteca se não estiver aqui. → Set */
export function fotosEmUso(dados = {}, extra = []) {
  const d = eObjecto(dados) ? dados : {};
  const usadas = new Set();
  /* Um nome com espaços à volta (escrito à mão) não aparece no site, mas conta como usado: na
     dúvida, uma fotografia nunca sai da biblioteca. */
  const juntar = (f) => { if (typeof f === 'string') { usadas.add(f); usadas.add(f.trim()); } };
  [...extra, ...fotosDasPaginas(d.paginas)].forEach(juntar);
  if (eObjecto(d.artigos)) for (const v of Object.values(d.artigos)) { const a = lerJson(v).obj; if (eObjecto(a) && Array.isArray(a.fotos)) a.fotos.forEach(juntar); }
  const cs = lerJson(d.categorias).obj;
  if (Array.isArray(cs)) for (const c of cs) if (eObjecto(c)) juntar(c.foto);
  fotosDoInicio(lerJson(d.inicio).obj).forEach(juntar);
  return usadas;
}
