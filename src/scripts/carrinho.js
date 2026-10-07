/* Pokóto Wood — o carrinho.
   Não há pagamentos no site: o carrinho junta os artigos, calcula os portes da zona escolhida
   e, no fim, abre o WhatsApp com a encomenda escrita. Nada sai do aparelho da pessoa até ela
   enviar a mensagem; no armazenamento local fica só o carrinho (artigos, personalização,
   zona) — nunca o nome, a morada ou o NIF (a política de privacidade promete isto).
   Os preços nunca se guardam: lêem-se sempre do catálogo publicado (assets/catalogo-*.json),
   para um preço mudado no backoffice valer logo. */
(function () {
  'use strict';
  const CHAVE = 'pokoto:carrinho';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hojeLisboa = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const euros = (v) => {
    const redondo = Number.isInteger(v);
    return `${v.toLocaleString('pt-PT', { minimumFractionDigits: redondo ? 0 : 2, maximumFractionDigits: 2 })} €`;
  };
  const ICONES = {
    mais: '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/></svg>',
    lixo: '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.2a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8l1-12.2M9 7V4.5h6V7"/></svg>',
  };

  // ---------------------------------------------------------------- estado
  function ler() {
    try {
      const e = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      if (e && e.v === 1 && Array.isArray(e.linhas)) return e;
    } catch (_) { /* armazenamento bloqueado ou estragado: começa vazio */ }
    return { v: 1, linhas: [], zona: 'levantamento' };
  }
  let estado = ler();
  let anuncio = ''; // o que o leitor de ecrã diz depois de uma acção; nunca vai para o armazenamento
  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (_) { /* modo privado sem armazenamento: o carrinho vive só nesta página */ }
    return desenharTudo();
  }
  window.addEventListener('storage', (e) => { if (e.key === CHAVE) { estado = ler(); desenharTudo(); } });

  let catalogoP = null;
  function catalogo() {
    if (!catalogoP) {
      catalogoP = fetch(document.body.dataset.catalogo).then((r) => {
        if (!r.ok) throw new Error(`catálogo ${r.status}`);
        return r.json();
      });
      catalogoP.catch(() => { catalogoP = null; });
    }
    return catalogoP;
  }

  // ---------------------------------------------------------------- contas
  // A mesma regra do site (src/templates/util.mjs, precoDe): acabada a promoção, volta o
  // preço normal.
  function precoDe(p, hoje) {
    const emPromocao = Boolean(p.precoAnterior) && p.precoAnterior > p.preco && (!p.promocaoAte || hoje <= p.promocaoAte);
    if (emPromocao) return { atual: p.preco, anterior: p.precoAnterior };
    if (p.precoAnterior && p.promocaoAte && hoje > p.promocaoAte) return { atual: p.precoAnterior, anterior: null };
    return { atual: p.preco, anterior: null };
  }
  const chaveLinha = (l) => [l.produto, [...(l.complementos || [])].sort().join('+'), (l.personalizacao || '').trim().toLowerCase()].join('|');

  function contas(cat, linhas, zona) {
    const hoje = hojeLisboa();
    let artigos = 0;
    let portes = 0;
    let portesPorConfirmar = false;
    const detalhe = linhas.map((l) => {
      const p = cat.produtos[l.produto];
      if (!p || !p.vendaIsolada) return { linha: l, p: null };
      const comps = (l.complementos || []).map((slug) => ({ slug, c: cat.produtos[slug], k: (p.complementos || []).find((k) => k.produto === slug) })).filter((x) => x.c && x.k);
      const unidade = precoDe(p, hoje).atual + comps.reduce((s, x) => s + precoDe(x.c, hoje).atual, 0);
      let envio = 0;
      if (zona !== 'levantamento') {
        const base = p.envio ? p.envio[zona] : null;
        if (!Number.isFinite(base)) envio = null;
        else envio = comps.reduce((s, x) => (s === null || !Number.isFinite(x.k.envioExtra && x.k.envioExtra[zona]) ? null : s + x.k.envioExtra[zona]), base);
      }
      const total = unidade * l.qtd;
      artigos += total;
      if (envio === null) portesPorConfirmar = true; else portes += envio * l.qtd;
      return { linha: l, p, comps, unidade, total, envio };
    });
    const validas = detalhe.filter((d) => d.p);
    return { detalhe, validas, artigos, portes, portesPorConfirmar, total: artigos + portes, unidades: validas.reduce((s, d) => s + d.linha.qtd, 0) };
  }

  // ---------------------------------------------------------------- API para o site.js
  async function juntar({ produto, complementos = [], personalizacao = '', qtd = 1 }) {
    const nova = { produto, complementos: [...complementos].sort(), personalizacao: personalizacao.trim().slice(0, 80), qtd: Math.max(1, Math.min(20, qtd)) };
    const igual = estado.linhas.find((l) => chaveLinha(l) === chaveLinha(nova));
    if (igual) igual.qtd = Math.min(20, igual.qtd + nova.qtd);
    else estado.linhas.push(nova);
    anuncio = 'Artigo juntado ao carrinho.';
    return guardar();
  }
  async function totalDe({ produto, complementos = [], qtd = 1 }) {
    try {
      const cat = await catalogo();
      const c = contas(cat, [{ produto, complementos, qtd }], 'levantamento');
      return c.validas.length ? euros(c.artigos) : '';
    } catch (_) { return ''; }
  }

  // ---------------------------------------------------------------- desenho das linhas
  function linhaHtml(d, cat) {
    const l = d.linha;
    const i = estado.linhas.indexOf(l);
    if (!d.p) {
      return `<li class="linha"><div></div><div><p class="linha__nome">Artigo que já não está à venda</p><p class="linha__indisponivel">Este artigo saiu da loja e não entra na encomenda.</p><div class="linha__fundo"><span></span><button class="linha__tirar" type="button" data-tirar="${i}">${ICONES.lixo}<span class="visualmente-escondido">Tirar do carrinho</span></button></div></div></li>`;
    }
    const extras = [
      ...d.comps.map((x) => `+ ${esc(x.c.nome)}`),
      l.personalizacao ? `Personalização: «${esc(l.personalizacao)}»` : '',
    ].filter(Boolean).map((t) => `<p class="linha__extra">${t}</p>`).join('');
    return `<li class="linha">
      <a class="linha__foto" href="${esc(d.p.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(d.p.foto)}" alt="" width="76" height="76" loading="lazy"></a>
      <div>
        <p class="linha__nome"><a href="${esc(d.p.url)}">${esc(d.p.nome)}</a></p>
        ${extras}
        <div class="linha__fundo">
          <div class="quantidade" data-quantidade data-linha="${i}">
            <button type="button" data-menos>${ICONES.menos}<span class="visualmente-escondido">Menos um de ${esc(d.p.nomeCurto)}</span></button>
            <span aria-live="polite"><span class="visualmente-escondido">Quantidade: </span>${l.qtd}</span>
            <button type="button" data-mais>${ICONES.mais}<span class="visualmente-escondido">Mais um de ${esc(d.p.nomeCurto)}</span></button>
          </div>
          <span class="linha__preco">${euros(d.total)}</span>
          <button class="linha__tirar" type="button" data-tirar="${i}">${ICONES.lixo}<span class="visualmente-escondido">Tirar ${esc(d.p.nomeCurto)} do carrinho</span></button>
        </div>
      </div>
    </li>`;
  }

  function totaisHtml(c, cat, zona) {
    const z = cat.zonas.find((x) => x.id === zona) || cat.zonas[0];
    const portes = zona === 'levantamento' ? 'Grátis' : (c.portesPorConfirmar ? 'a confirmar' : euros(c.portes));
    const total = c.portesPorConfirmar && zona !== 'levantamento' ? `${euros(c.artigos)} + portes` : euros(c.total);
    const varios = zona !== 'levantamento' && c.unidades > 1 && cat.notaVarios ? `<span class="totais__nota">${esc(cat.notaVarios)}</span>` : '';
    return `<p><span>Artigos</span><span>${euros(c.artigos)}</span></p>
      <p><span>${esc(z.curto)}</span><span>${portes}</span></p>
      ${varios}
      <p class="totais__total"><span>Total</span><span>${total}</span></p>`;
  }

  // ---------------------------------------------------------------- gaveta
  async function desenharGaveta() {
    const alvo = $('[data-carrinho-gaveta]');
    if (!alvo) return;
    let cat;
    try { cat = await catalogo(); } catch (_) { alvo.innerHTML = '<p class="gaveta__vazio">Não conseguimos carregar o carrinho. Verifique a ligação e tente outra vez.</p>'; return; }
    const aviso = anuncio ? `<p class="visualmente-escondido" role="status">${esc(anuncio)}</p>` : '';
    anuncio = '';
    if (!estado.linhas.length) {
      alvo.innerHTML = `${aviso}<p class="gaveta__vazio">O carrinho está vazio.</p><div class="gaveta__acoes"><a class="botao botao--mel" href="${esc(cat.carrinho.replace(/carrinho\/$/, 'loja/'))}">Ver a loja</a></div>`;
      return;
    }
    const zona = estado.zona || 'levantamento';
    const c = contas(cat, estado.linhas, zona);
    alvo.innerHTML = `${aviso}
      <ul class="linhas">${c.detalhe.map((d) => linhaHtml(d, cat)).join('')}</ul>
      <div class="gaveta__zonas">
        <label for="gaveta-zona">Entrega</label>
        <select id="gaveta-zona" data-zona>${cat.zonas.map((z) => `<option value="${esc(z.id)}"${z.id === zona ? ' selected' : ''}>${esc(z.nome)}</option>`).join('')}</select>
      </div>
      <div class="totais" aria-live="polite">${totaisHtml(c, cat, zona)}</div>
      <div class="gaveta__acoes">
        <a class="botao botao--mel" href="${esc(cat.carrinho)}">Finalizar a encomenda</a>
        <button class="botao botao--contorno" type="button" data-fechar>Continuar a ver</button>
      </div>`;
  }

  // ---------------------------------------------------------------- página do carrinho
  const pagina = $('[data-carrinho-pagina]');
  const form = $('form[data-encomenda]');
  let ultimaMensagem = '';

  async function desenharPagina() {
    if (!pagina) return;
    const lista = $('[data-carrinho-lista]', pagina);
    let cat;
    try { cat = await catalogo(); } catch (_) { lista.innerHTML = '<p class="carrinho-vazio">Não conseguimos carregar o carrinho. Verifique a ligação e recarregue a página.</p>'; return; }
    const radios = $$('input[name="entrega"]', form);
    if (!radios.some((r) => r.value === estado.zona)) estado.zona = radios[0].value;
    radios.forEach((r) => { r.checked = r.value === estado.zona; });
    const vazio = !estado.linhas.length;
    form.hidden = vazio;
    if (vazio) {
      lista.innerHTML = `<p class="carrinho-vazio">O carrinho está vazio. <a href="${esc(cat.carrinho.replace(/carrinho\/$/, 'loja/'))}">Ver a loja</a></p>`;
      return;
    }
    const c = contas(cat, estado.linhas, estado.zona);
    lista.innerHTML = `<ul class="linhas">${c.detalhe.map((d) => linhaHtml(d, cat)).join('')}</ul>`;
    // o preço dos portes ao lado de cada opção de entrega, para comparar antes de escolher
    $$('[data-preco-zona]', form).forEach((s) => {
      const z = s.dataset.precoZona;
      if (z === 'levantamento') { s.textContent = 'Grátis'; return; }
      const cz = contas(cat, estado.linhas, z);
      s.textContent = cz.portesPorConfirmar ? 'a confirmar' : euros(cz.portes);
    });
    $('[data-totais]', form).innerHTML = totaisHtml(c, cat, estado.zona);
    const comMorada = (cat.zonas.find((z) => z.id === estado.zona) || {}).morada;
    $$('[data-so-envio]', form).forEach((e) => { e.hidden = !comMorada; });
    $$('[data-obrigatorio-envio]', form).forEach((i) => { i.required = Boolean(comMorada); });
  }

  function desenharConta() {
    const n = estado.linhas.reduce((s, l) => s + l.qtd, 0);
    $$('[data-conta]').forEach((b) => {
      b.hidden = n === 0;
      b.textContent = n > 99 ? '99+' : String(n);
      const rotulo = b.parentElement && $('.visualmente-escondido', b.parentElement);
      if (rotulo) rotulo.textContent = n ? `Carrinho, ${n} ${n === 1 ? 'artigo' : 'artigos'}` : 'Carrinho';
    });
  }

  function desenharTudo() {
    desenharConta();
    const g = document.getElementById('carrinho');
    return Promise.all([g && g.open ? desenharGaveta() : null, desenharPagina()]);
  }

  // ---------------------------------------------------------------- acções nas linhas
  // As linhas redesenham-se por inteiro: o botão onde estava o foco deixa de existir. Depois de
  // redesenhar, o foco volta ao botão equivalente (o mesmo «+» da mesma linha), e quando a linha
  // sai vai para o título — nunca fica perdido no <body>.
  document.addEventListener('click', async (e) => {
    const onde = e.target.closest('dialog') ? '#carrinho' : '[data-carrinho-pagina]';
    const tirar = e.target.closest('[data-tirar]');
    if (tirar) {
      estado.linhas.splice(Number(tirar.dataset.tirar), 1);
      anuncio = 'Artigo tirado do carrinho.';
      await guardar();
      const titulo = document.querySelector(onde === '#carrinho' ? '#carrinho-titulo' : '#encomenda-titulo, .carrinho-pagina h1');
      if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
      return;
    }
    const b = e.target.closest('[data-linha] [data-mais], [data-linha] [data-menos]');
    if (b) {
      const l = estado.linhas[Number(b.closest('[data-linha]').dataset.linha)];
      if (!l) return;
      const accao = b.hasAttribute('data-mais') ? 'data-mais' : 'data-menos';
      l.qtd = Math.max(1, Math.min(20, l.qtd + (accao === 'data-mais' ? 1 : -1)));
      await guardar();
      const novo = document.querySelector(`${onde} [data-linha="${estado.linhas.indexOf(l)}"] [${accao}]`);
      if (novo) novo.focus();
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-zona], input[name="entrega"]')) {
      estado.zona = e.target.value;
      guardar();
    }
  });

  // ---------------------------------------------------------------- a mensagem e o envio
  function referencia() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const n = crypto.getRandomValues(new Uint8Array(5));
    return `PW-${Array.from(n, (x) => letras[x % letras.length]).join('')}`;
  }

  function mensagem(cat, c, dados, ref) {
    const z = cat.zonas.find((x) => x.id === estado.zona);
    const linhas = [`Olá ${cat.marca}! Gostava de fazer esta encomenda:`, ''];
    for (const d of c.validas) {
      linhas.push(`*${d.linha.qtd}× ${d.p.nome}* — ${euros(d.total)}`);
      for (const x of d.comps) linhas.push(`   + ${x.c.nome}`);
      if (d.linha.personalizacao) linhas.push(`   Personalização: «${d.linha.personalizacao}»`);
    }
    linhas.push('');
    linhas.push(`Artigos: ${euros(c.artigos)}`);
    if (estado.zona === 'levantamento') linhas.push(`Entrega: ${z.nome} (grátis)`);
    else linhas.push(`Entrega: ${z.nome} — ${c.portesPorConfirmar ? 'portes a confirmar' : euros(c.portes)}`);
    linhas.push(c.portesPorConfirmar && estado.zona !== 'levantamento' ? `*Total: ${euros(c.artigos)} + portes*` : `*Total: ${euros(c.total)}*`);
    linhas.push('');
    linhas.push(`Nome: ${dados.nome}`);
    if (z.morada) linhas.push(`Morada: ${dados.morada}, ${dados.codigoPostal} ${dados.localidade}`);
    if (dados.nif) linhas.push(`NIF: ${dados.nif}`);
    if (dados.notas) linhas.push(`Observações: ${dados.notas}`);
    linhas.push('');
    linhas.push(`Ref.ª ${ref} · encomenda feita no site`);
    return linhas.join('\n');
  }

  if (form) {
    const erro = $('[data-erro-encomenda]', form);
    const enviada = $('[data-enviada]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.hidden = true;
      $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
      let cat;
      try { cat = await catalogo(); } catch (_) { erro.textContent = 'Não conseguimos carregar o catálogo. Verifique a ligação e tente outra vez.'; erro.hidden = false; return; }
      const c = contas(cat, estado.linhas, estado.zona);
      if (!c.validas.length) { erro.textContent = 'O carrinho está vazio.'; erro.hidden = false; return; }
      const campos = ['nome', 'morada', 'codigoPostal', 'localidade'].map((n) => form.elements[n]).filter((i) => i.required && !i.value.trim());
      if (campos.length) {
        campos.forEach((i) => i.setAttribute('aria-invalid', 'true'));
        erro.textContent = `Falta preencher: ${campos.map((i) => form.querySelector(`label[for="${i.id}"]`).textContent.toLowerCase()).join(', ')}.`;
        erro.hidden = false;
        campos[0].focus();
        return;
      }
      const dados = Object.fromEntries(['nome', 'morada', 'codigoPostal', 'localidade', 'nif', 'notas'].map((n) => [n, form.elements[n].value.trim().replace(/\s+/g, ' ')]));
      ultimaMensagem = mensagem(cat, c, dados, referencia());
      const url = `https://wa.me/${cat.whatsapp || ''}?text=${encodeURIComponent(ultimaMensagem)}`;
      const janela = window.open(url, '_blank', 'noopener');
      if (!janela) location.href = url;
      enviada.hidden = false;
    });
    $('[data-copiar]', form).addEventListener('click', async (e) => {
      const b = e.currentTarget; // guardado antes do await: depois dele vale null
      try {
        await navigator.clipboard.writeText(ultimaMensagem);
        b.lastElementChild.textContent = 'Mensagem copiada';
      } catch (_) {
        b.lastElementChild.textContent = 'Não foi possível copiar';
      }
    });
    $('[data-esvaziar]', form).addEventListener('click', async () => {
      estado = { v: 1, linhas: [], zona: estado.zona };
      enviada.hidden = true;
      form.reset();
      await guardar();
      const h1 = document.querySelector('.carrinho-pagina h1');
      if (h1) { h1.tabIndex = -1; h1.focus(); }
    });
  }

  window.PokotoCarrinho = { juntar, totalDe, desenharGaveta };
  desenharConta();
  desenharPagina();
})();
