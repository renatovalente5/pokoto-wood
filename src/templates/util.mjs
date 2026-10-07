// Utilitários dos modelos: escapar HTML, Markdown mínimo, dinheiro, datas e moradas do site.

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Euros à portuguesa: «75 €», «1 234,50 €». Sem casas decimais quando é um número redondo,
// como a Célia escreve os preços («75€», «110€»).
export function euros(v) {
  const n = Number(v);
  const redondo = Number.isInteger(n);
  const s = n.toLocaleString('pt-PT', { minimumFractionDigits: redondo ? 0 : 2, maximumFractionDigits: 2 });
  return `${s.replace(/ /g, ' ')} €`;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// «2026-12-31» → «31 de dezembro»; com ano: «31 de dezembro de 2026»
export function dataPorExtenso(iso, comAno = false) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]}${comAno ? ` de ${a}` : ''}`;
}

// O dia de hoje em Portugal (a publicação corre em UTC no GitHub; à meia-noite de cá ainda é
// o dia anterior lá — a data de uma promoção conta em Lisboa).
export function hojeEmLisboa(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

// O preço que vale hoje. «preco» é o preço de venda (o da promoção, quando há uma) e
// «precoAnterior» o preço normal. Acabada a promoção, volta o preço normal: a mesma regra está
// no carrinho (src/scripts/carrinho.js, precoDe), para o site e o carrinho nunca discordarem.
export function precoDe(p, hoje) {
  const emPromocao = Boolean(p.precoAnterior) && p.precoAnterior > p.preco && (!p.promocaoAte || hoje <= p.promocaoAte);
  if (emPromocao) return { atual: p.preco, anterior: p.precoAnterior, ate: p.promocaoAte || '' };
  if (p.precoAnterior && p.promocaoAte && hoje > p.promocaoAte) return { atual: p.precoAnterior, anterior: null, ate: '' };
  return { atual: p.preco, anterior: null, ate: '' };
}

// Markdown mínimo para as páginas de texto: títulos ##/###, parágrafos, listas (- e 1.),
// **negrito**, *itálico*, [ligações](url) e quadros simples (| a | b |). Mais do que isto não
// é preciso e cada coisa a mais é uma coisa a mais para o backoffice explicar.
export function markdown(src, url = (u) => u) {
  const linhas = src.replace(/\r/g, '').split('\n');
  const out = [];
  let para = [];
  let lista = null;
  let quadro = null;
  const fecharPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '), url)}</p>`); para = []; } };
  const fecharLista = () => { if (lista) { out.push(`<${lista.tipo}>${lista.itens.map((i) => `<li>${inline(i, url)}</li>`).join('')}</${lista.tipo}>`); lista = null; } };
  const fecharQuadro = () => {
    if (!quadro) return;
    const [cab, ...corpo] = quadro.filter((l) => !/^\|\s*-/.test(l));
    const cel = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    out.push(`<div class="quadro"><table><thead><tr>${cel(cab).map((c) => `<th scope="col">${inline(c, url)}</th>`).join('')}</tr></thead><tbody>${corpo.map((l) => `<tr>${cel(l).map((c) => `<td>${inline(c, url)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    quadro = null;
  };
  for (const linha of linhas) {
    const t = linha.trim();
    if (/^\|/.test(t)) { fecharPara(); fecharLista(); (quadro ||= []).push(t); continue; }
    fecharQuadro();
    if (!t) { fecharPara(); fecharLista(); continue; }
    const h = t.match(/^(#{2,4})\s+(.*)$/);
    if (h) { fecharPara(); fecharLista(); out.push(`<h${h[1].length}>${inline(h[2], url)}</h${h[1].length}>`); continue; }
    const li = t.match(/^(-|\d+\.)\s+(.*)$/);
    if (li) {
      fecharPara();
      const tipo = li[1] === '-' ? 'ul' : 'ol';
      if (lista && lista.tipo !== tipo) fecharLista();
      (lista ||= { tipo, itens: [] }).itens.push(li[2]);
      continue;
    }
    if (lista && /^\s{2,}/.test(linha)) { lista.itens[lista.itens.length - 1] += ' ' + t; continue; }
    fecharLista();
    para.push(t);
  }
  fecharPara(); fecharLista(); fecharQuadro();
  return out.join('\n');
}

export function inline(s, url = (u) => u) {
  let r = esc(s);
  r = r.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, texto, destino) => {
    const d = destino.replace(/&amp;/g, '&');
    const externo = /^https?:\/\//.test(d);
    const href = externo || /^(mailto|tel):/.test(d) || d.startsWith('#') ? d : url(d);
    return `<a href="${esc(href)}"${externo ? ' target="_blank" rel="noopener"' : ''}>${texto}</a>`;
  });
  r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  r = r.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return r;
}

// Número português para o WhatsApp: «912 345 678» → «351912345678». Um número já com o
// indicativo (+351…, 00351…, ou de outro país) fica como está, só com os algarismos.
export function numeroWhatsApp(n) {
  let d = String(n || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (/^9\d{8}$/.test(d) || /^2\d{8}$/.test(d)) d = '351' + d;
  return d.replace(/\D/g, '');
}

// «351912345678» → «912 345 678» (para mostrar)
export function numeroLegivel(n) {
  const d = numeroWhatsApp(n);
  const local = d.startsWith('351') ? d.slice(3) : d;
  return local.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');
}

// A nota que a lei pede junto de um número de telefone (DL 59/2021): depende da rede.
export function custoChamada(n) {
  const local = numeroWhatsApp(n).replace(/^351/, '');
  if (/^9/.test(local)) return 'Chamada para a rede móvel nacional';
  if (/^2/.test(local)) return 'Chamada para a rede fixa nacional';
  return 'Chamada para a rede nacional';
}

// A morada da sede por extenso: «Rua dos Portais, n.º 940, 4770-465 Requião, Vila Nova de Famalicão»
export function moradaCompleta(e) {
  return [e.morada, [e.codigoPostal, e.localidade].filter(Boolean).join(' '), e.concelho].filter(Boolean).join(', ');
}
