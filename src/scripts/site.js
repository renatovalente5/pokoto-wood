/* Pokóto Wood — o comportamento das páginas (sem dependências).
   O carrinho está em carrinho.js; os dois vão no mesmo ficheiro, este primeiro. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hojeLisboa = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const ICONE_PAUSA = '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M9 6.5v11M15 6.5v11"/></svg>';
  const ICONE_TOCAR = '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5L8 5.5Z"/></svg>';

  // ---------------------------------------------------------------- o anel do foco
  // Ao abrir o menu, o foco vai para o primeiro elemento (o logótipo), como deve, e o Safari do
  // iPhone desenha-lhe o anel mesmo depois de um toque: uma moldura verde que só confunde. Guarda-se
  // como foi a última interacção: um toque ou um clique escondem o anel (o CSS, em
  // html[data-entrada="ponteiro"]); uma tecla volta a mostrá-lo, para quem navega pelo teclado.
  const raiz = document.documentElement;
  addEventListener('pointerdown', () => { raiz.dataset.entrada = 'ponteiro'; }, { capture: true, passive: true });
  addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey) delete raiz.dataset.entrada; }, { capture: true });

  // ---------------------------------------------------------------- etiquetas em duas linhas
  // Partido em duas linhas, o texto deixava a caixa com a largura toda e um vazio à direita. Mede-se
  // a linha mais comprida e a caixa fica à medida dela (outra vez quando as letras chegam e quando
  // a janela muda de largura).
  const etiquetas = $$('.etiqueta');
  function ajustarEtiquetas() {
    for (const e of etiquetas) {
      e.style.width = '';
      e.classList.remove('etiqueta--linhas');
      const r = document.createRange();
      r.selectNodeContents(e);
      const linhas = Array.from(r.getClientRects()).filter((l) => l.width > 0);
      if (linhas.length < 2) continue;
      const cs = getComputedStyle(e);
      const lados = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((t, k) => t + parseFloat(cs[k]), 0);
      e.style.width = `${Math.ceil(Math.max(...linhas.map((l) => l.width)) + lados + 1)}px`;
      e.classList.add('etiqueta--linhas');
    }
  }
  if (etiquetas.length) {
    ajustarEtiquetas();
    if (document.fonts) document.fonts.ready.then(ajustarEtiquetas);
    let pedido = 0;
    addEventListener('resize', () => { cancelAnimationFrame(pedido); pedido = requestAnimationFrame(ajustarEtiquetas); });
  }

  // ---------------------------------------------------------------- aviso do topo com data
  // O site só muda quando se publica; o aviso «até 15 de outubro» sai sozinho no dia 16.
  $$('.aviso[data-ate]').forEach((a) => { if (hojeLisboa() > a.dataset.ate) a.hidden = true; });

  // ---------------------------------------------------------------- menu e gaveta do carrinho
  // A página por trás fica trancada pelo CSS (html:has(dialog[open])): derivado do próprio
  // diálogo, nunca de uma classe que se põe e tira (um «close» perdido deixava-a presa).
  const dialogos = $$('dialog');
  dialogos.forEach((d) => {
    if (d.open) d.close(); // o Chrome repõe o «open» ao voltar atrás: abre-se outra vez à mão
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // clique no fundo
    // por delegação: o conteúdo da gaveta é desenhado depois, pelo carrinho.js
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-fechar]')) { d.close(); return; }
      const a = e.target.closest('a[href]');
      if (a && !a.target) d.close();
    });
  });
  function abrir(id, origem) {
    const d = document.getElementById(id);
    if (!d || d.open) return;
    d.showModal();
    d._origem = origem || null;
    if (id === 'carrinho' && window.PokotoCarrinho) window.PokotoCarrinho.desenharGaveta();
  }
  dialogos.forEach((d) => d.addEventListener('close', () => { if (d._origem && document.contains(d._origem)) d._origem.focus(); }));
  $$('[data-abrir]').forEach((b) => b.addEventListener('click', (e) => {
    if (b.dataset.abrir === 'carrinho' && document.body.classList.contains('pagina-carrinho')) return; // já está no carrinho
    e.preventDefault();
    abrir(b.dataset.abrir, b);
  }));
  window.PokotoAbrir = abrir;

  // ---------------------------------------------------------------- navegação com painéis
  const abridores = $$('.nav__abrir');
  const fecharPaineis = (excepto) => abridores.forEach((b) => { if (b !== excepto) b.setAttribute('aria-expanded', 'false'); });
  abridores.forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const aberto = b.getAttribute('aria-expanded') === 'true';
    fecharPaineis(b);
    b.setAttribute('aria-expanded', String(!aberto));
  }));
  document.addEventListener('click', (e) => { if (!e.target.closest('.nav__item--painel')) fecharPaineis(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const aberto = abridores.find((b) => b.getAttribute('aria-expanded') === 'true');
    if (aberto) { aberto.setAttribute('aria-expanded', 'false'); aberto.focus(); }
  });

  // ---------------------------------------------------------------- carrossel e separadores
  $$('[data-carrossel]').forEach((c) => {
    const pista = $('.carrossel__pista', c);
    const barra = $('.carrossel__progresso span', c);
    const ant = $('[data-anterior]', c);
    const seg = $('[data-seguinte]', c);
    const actualizar = () => {
      const max = pista.scrollWidth - pista.clientWidth;
      const frac = pista.scrollWidth ? pista.clientWidth / pista.scrollWidth : 1;
      barra.style.width = `${Math.min(100, frac * 100)}%`;
      barra.style.left = `${max > 0 ? (pista.scrollLeft / max) * (100 - frac * 100) : 0}%`;
      ant.disabled = pista.scrollLeft <= 2;
      seg.disabled = pista.scrollLeft >= max - 2;
      c.classList.toggle('carrossel--parado', max <= 2);
    };
    const passo = () => {
      const cartao = $('.cartao:not([hidden])', pista);
      const largura = cartao ? cartao.getBoundingClientRect().width + parseFloat(getComputedStyle(pista).columnGap || 0) : pista.clientWidth;
      return Math.max(largura, Math.floor(pista.clientWidth / largura) * largura);
    };
    const mover = (d) => pista.scrollBy({ left: d * passo(), behavior: menosMovimento.matches ? 'auto' : 'smooth' });
    ant.addEventListener('click', () => mover(-1));
    seg.addEventListener('click', () => mover(1));
    pista.addEventListener('scroll', actualizar, { passive: true });
    window.addEventListener('resize', actualizar);
    const seccao = c.closest('section');
    const botoes = seccao ? $$('.separadores button', seccao) : [];
    const filtrar = (f) => {
      $$('.cartao', pista).forEach((k) => { k.hidden = !k.dataset.filtros.split(' ').includes(f); });
      pista.scrollLeft = 0;
      actualizar();
    };
    botoes.forEach((b) => b.addEventListener('click', () => {
      botoes.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      filtrar(b.dataset.filtro);
    }));
    if (botoes.length) filtrar(pista.dataset.filtroAtivo || 'todos');
    actualizar();
  });

  // ---------------------------------------------------------------- faixa em movimento
  // Movimento em JavaScript (scrollLeft), nunca uma animação CSS infinita: com «reduzir
  // movimento» fica parada, e os cliques acertam sempre (as posições são as verdadeiras).
  $$('[data-faixa]').forEach((f) => {
    const pista = $('.faixa__pista', f);
    const botao = $('[data-faixa-pausa]', f);
    const rotulo = $('.visualmente-escondido', botao);
    let pos = 0;
    let parada = menosMovimento.matches;
    let visivel = false;
    let ultimo = 0;
    const desenharBotao = () => {
      botao.setAttribute('aria-pressed', String(parada));
      botao.firstElementChild.outerHTML = parada ? ICONE_TOCAR : ICONE_PAUSA;
      rotulo.textContent = parada ? 'Pôr a faixa a andar' : 'Parar o movimento';
    };
    const passo = (t) => {
      if (!parada && visivel) {
        const dt = ultimo ? Math.min(64, t - ultimo) : 16;
        pos += dt * 0.035; // ~35 px por segundo
        const volta = pista.scrollWidth / 4; // há quatro voltas iguais das palavras
        if (pos >= volta) pos -= volta;
        pista.scrollLeft = pos;
      }
      ultimo = t;
      requestAnimationFrame(passo);
    };
    new IntersectionObserver((es) => { visivel = es[0].isIntersecting; }).observe(f);
    botao.addEventListener('click', () => { parada = !parada; desenharBotao(); });
    desenharBotao();
    requestAnimationFrame(passo);
  });

  // ---------------------------------------------------------------- vídeos
  // Sem som e em ciclo. Começam sozinhos quando aparecem no ecrã — excepto com «reduzir
  // movimento» ou «poupar dados»; aí ficam na imagem de capa à espera do botão.
  const poupar = navigator.connection && navigator.connection.saveData;
  $$('[data-video]').forEach((v) => {
    const video = $('video', v);
    const botao = $('[data-video-botao]', v);
    const rotulo = $('.visualmente-escondido', botao);
    let escolhaDaPessoa = false;
    const desenhar = () => {
      const tocar = video.paused;
      botao.setAttribute('aria-pressed', String(!tocar));
      botao.firstElementChild.outerHTML = tocar ? ICONE_TOCAR : ICONE_PAUSA;
      rotulo.textContent = tocar ? 'Ver o vídeo' : 'Parar o vídeo';
    };
    video.addEventListener('play', desenhar);
    video.addEventListener('pause', desenhar);
    botao.addEventListener('click', () => {
      escolhaDaPessoa = true;
      if (video.paused) video.play().catch(() => {}); else video.pause();
    });
    if (!menosMovimento.matches && !poupar) {
      new IntersectionObserver((es) => {
        if (escolhaDaPessoa) return;
        if (es[0].isIntersecting) video.play().catch(() => {}); else video.pause();
      }, { threshold: 0.4 }).observe(v);
    }
    desenhar();
  });

  // ---------------------------------------------------------------- galeria da ficha
  $$('[data-galeria]').forEach((g) => {
    const pista = $('.galeria__pista', g);
    const minis = $$('[data-foto]', g);
    if (!minis.length) return;
    minis.forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.foto);
      pista.scrollTo({ left: i * pista.clientWidth, behavior: menosMovimento.matches ? 'auto' : 'smooth' });
    }));
    pista.addEventListener('scroll', () => {
      const i = Math.round(pista.scrollLeft / pista.clientWidth);
      minis.forEach((b, n) => (n === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    }, { passive: true });
  });

  // ---------------------------------------------------------------- quantidades (+ / −)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mais], [data-menos]');
    if (!b) return;
    const q = b.closest('[data-quantidade]');
    if (!q || q.hasAttribute('data-linha')) return; // as do carrinho são do carrinho.js
    const input = $('input', q);
    const n = Math.min(20, Math.max(1, (parseInt(input.value, 10) || 1) + (b.hasAttribute('data-mais') ? 1 : -1)));
    input.value = n;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // ---------------------------------------------------------------- juntar ao carrinho
  $$('form[data-comprar]').forEach((form) => {
    const slug = form.dataset.comprar;
    const erro = $('[data-erro]', form);
    const total = $('[data-total]', form);
    const pers = form.elements.personalizacao;
    // ?com=prancha-dupla-face vem da página da prancha: já vem escolhida
    const com = new URLSearchParams(location.search).get('com');
    if (com) $$('input[name="complemento"]', form).forEach((c) => { if (c.value === com) c.checked = true; });
    const escolhidos = () => $$('input[name="complemento"]:checked', form).map((c) => c.value);
    const quantidade = () => Math.min(20, Math.max(1, parseInt(form.elements.quantidade.value, 10) || 1));
    const mostrarTotal = async () => {
      if (!window.PokotoCarrinho) return;
      const t = await window.PokotoCarrinho.totalDe({ produto: slug, complementos: escolhidos(), qtd: quantidade() });
      total.textContent = t ? `Total: ${t}` : '';
    };
    form.addEventListener('input', mostrarTotal);
    form.addEventListener('change', mostrarTotal);
    mostrarTotal();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.hidden = true;
      if (pers) pers.removeAttribute('aria-invalid');
      const texto = pers ? pers.value.trim() : '';
      if (pers && pers.required && !texto) {
        erro.textContent = 'Escreva o nome a gravar: está incluído no preço.';
        erro.hidden = false;
        pers.setAttribute('aria-invalid', 'true');
        pers.focus();
        return;
      }
      await window.PokotoCarrinho.juntar({ produto: slug, complementos: escolhidos(), personalizacao: texto, qtd: quantidade() });
      if (pers) pers.value = '';
      form.elements.quantidade.value = 1;
      $$('input[name="complemento"]', form).forEach((c) => { c.checked = false; });
      mostrarTotal();
      abrir('carrinho', $('button[type="submit"]', form));
    });
  });
})();
