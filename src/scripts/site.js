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

  // ---------------------------------------------------------------- a origem dos anúncios
  // Os links dos anúncios levam ?origem=meta ou ?origem=google (plano de anúncios, 16 out 2026).
  // Sem cookies nem armazenamento: a marca segue no endereço, de ligação interna em ligação
  // interna, até ao carrinho, que a junta à mensagem do WhatsApp (carrinho.js). Quem chega de
  // outra forma não leva nada.
  const origem = new URLSearchParams(location.search).get('origem');
  if (/^(meta|google)$/.test(origem || '')) {
    const marcar = (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.searchParams.has('origem')) return;
      if (url.pathname === location.pathname && url.hash) return; // âncora na mesma página
      url.searchParams.set('origem', origem);
      a.href = url.href;
    };
    addEventListener('click', marcar, { capture: true });
    addEventListener('auxclick', marcar, { capture: true });
  }

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

  // ---------------------------------------------------------------- a loja no menu do computador
  // «Loja» abre o painel com as categorias e os artigos todos: com um clique (ou Enter e Espaço) e,
  // com o rato, também ao parar em cima dele. Passar por cima a caminho de «Sobre nós» não abre
  // nada; o que o rato abriu, o rato fecha ao sair. Fecha com Escape, com um clique fora e quando
  // o foco sai dele.
  const loja = $('.nav__loja');
  if (loja) {
    const item = loja.parentElement;
    let peloRato = 0; // quando o rato o abriu; 0 se foi um clique (fica aberto) ou está fechado
    let espera = 0;
    const aberto = () => loja.getAttribute('aria-expanded') === 'true';
    const definir = (abrir, rato = false) => {
      clearTimeout(espera);
      loja.setAttribute('aria-expanded', String(abrir));
      peloRato = abrir && rato ? Date.now() : 0;
    };
    loja.addEventListener('click', () => {
      // O rato abriu-o há um instante: o clique que vinha a caminho segura-o aberto.
      if (peloRato && Date.now() - peloRato < 600) { peloRato = 0; return; }
      definir(!aberto());
    });
    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(espera);
      if (!aberto()) espera = setTimeout(() => definir(true, true), 150);
    });
    item.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(espera);
      if (peloRato) espera = setTimeout(() => definir(false), 300);
    });
    item.addEventListener('focusout', (e) => { if (aberto() && e.relatedTarget && !item.contains(e.relatedTarget)) definir(false); });
    document.addEventListener('click', (e) => { if (aberto() && !item.contains(e.target)) definir(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !aberto()) return;
      const dentro = item.contains(document.activeElement);
      definir(false);
      if (dentro) loja.focus();
    });
    window.matchMedia('(min-width: 1180px)').addEventListener('change', () => definir(false));
    loja.closest('.nav').dataset.pronta = '';
  }

  // ---------------------------------------------------------------- carrossel
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
      const cartao = $('.cartao', pista);
      const largura = cartao ? cartao.getBoundingClientRect().width + parseFloat(getComputedStyle(pista).columnGap || 0) : pista.clientWidth;
      return Math.max(largura, Math.floor(pista.clientWidth / largura) * largura);
    };
    const mover = (d) => pista.scrollBy({ left: d * passo(), behavior: menosMovimento.matches ? 'auto' : 'smooth' });
    ant.addEventListener('click', () => mover(-1));
    seg.addEventListener('click', () => mover(1));
    pista.addEventListener('scroll', actualizar, { passive: true });
    window.addEventListener('resize', actualizar);
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
    // O botão não se vê (só com o teclado): tocar na faixa pára-a e põe-na a andar.
    f.addEventListener('click', (e) => { if (e.target.closest('[data-faixa-pausa]')) return; parada = !parada; desenharBotao(); });
    desenharBotao();
    requestAnimationFrame(passo);
  });

  // ---------------------------------------------------------------- vídeos
  // Sem som e em ciclo. Começam sozinhos quando aparecem no ecrã — excepto com «reduzir
  // movimento» ou «poupar dados» (ou se o telemóvel recusar, como no modo de poupança de bateria do
  // iPhone); aí ficam na imagem de capa, com o botão de ver à vista. A tocar, não há botão à vista
  // (a Célia, 9 out 2026): tocar no vídeo pára-o, e aparece o de ver; com o teclado, o botão
  // aparece quando se chega a ele.
  const poupar = navigator.connection && navigator.connection.saveData;
  const automatico = !menosMovimento.matches && !poupar;
  $$('[data-video]').forEach((v) => {
    const video = $('video', v);
    const botao = $('[data-video-botao]', v);
    const rotulo = $('.visualmente-escondido', botao);
    let escolhaDaPessoa = false;
    let recusado = false;
    const desenhar = () => {
      const tocar = video.paused;
      botao.setAttribute('aria-pressed', String(!tocar));
      botao.firstElementChild.outerHTML = tocar ? ICONE_TOCAR : ICONE_PAUSA;
      rotulo.textContent = tocar ? 'Ver o vídeo' : 'Parar o vídeo';
      v.classList.toggle('video--parado', tocar && (!automatico || escolhaDaPessoa || recusado));
    };
    const alternar = () => {
      escolhaDaPessoa = true;
      if (video.paused) video.play().catch(() => {}); else video.pause();
    };
    video.addEventListener('play', desenhar);
    video.addEventListener('pause', desenhar);
    botao.addEventListener('click', alternar);
    video.addEventListener('click', alternar);
    if (automatico) {
      new IntersectionObserver((es) => {
        if (escolhaDaPessoa) return;
        if (es[0].isIntersecting) video.play().catch(() => { recusado = true; desenhar(); }); else video.pause();
      }, { threshold: 0.4 }).observe(v);
    }
    desenhar();
  });

  // ---------------------------------------------------------------- loja: a categoria aberta à vista
  // No telemóvel a fila das categorias desliza, e a categoria aberta (a quinta, «Decoração») ficava
  // para lá da borda: não se via qual estava escolhida. Centra-se na fila, sem mexer na página; e
  // outra vez quando as letras chegam, porque mudam a largura dos botões.
  const fila = $('.chips ul');
  const aberta = fila && $('[aria-current]', fila);
  if (aberta) {
    const centrar = () => {
      if (fila.scrollWidth <= fila.clientWidth) return;
      const li = aberta.parentElement;
      fila.scrollLeft = li.offsetLeft - (fila.clientWidth - li.offsetWidth) / 2;
    };
    centrar();
    if (document.fonts) document.fonts.ready.then(centrar);
  }

  // ---------------------------------------------------------------- opiniões: o formulário do convite
  // /opinioes/escrever/#c=<convite> (a ligação pessoal que a loja manda pelo WhatsApp depois da entrega)
  // ou #e=<edição> (a ligação que a pessoa recebe ao enviar, para ver, alterar ou retirar a sua). Fala
  // com o painel (data-api). O fragmento não vai nos pedidos ao servidor do site nem nos registos; e lê-se
  // também quando muda sem recarregar (memória fragmento-nao-recarrega).
  const escrever = $('[data-escrever]');
  if (escrever) {
    const api = escrever.dataset.api.replace(/\/+$/, '');
    const titulo = $('[data-escrever-titulo]');
    const form = $('form', escrever);
    const erro = $('[data-erro]', form);
    const passos = $$('[data-passo]', escrever);
    const ESTRELAS = (n) => `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
    const escH = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const nomeDoArtigo = (slug) => ($(`#op-artigo option[value="${CSS.escape(slug || '')}"]`)?.textContent || '').trim();
    let modo = null; // { c } ou { e }
    const mostrar = (passo, { focar = true } = {}) => {
      passos.forEach((p) => { p.hidden = p.dataset.passo !== passo; });
      if (focar) titulo.focus({ preventScroll: false });
    };
    const aviso = (texto) => { $('[data-aviso]', escrever).textContent = texto; mostrar('aviso'); };
    const SEM_REDE = 'Sem ligação à internet, ou o nosso servidor não respondeu. Tente de novo daqui a um minuto.';
    async function pedir(caminho, corpo) {
      const r = await fetch(`${api}${caminho}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
      let j = {}; try { j = await r.json(); } catch (_) { /* sem corpo */ }
      return { estado: r.status, j };
    }
    const FRASES = {
      convite_invalido: 'Esta ligação não é válida. Confirme que a abriu inteira, a partir da mensagem que lhe enviámos, ou peça-nos outra.',
      convite_usado: 'Esta ligação já foi usada para enviar uma opinião. Para a ver ou alterar, use a ligação que recebeu quando a enviou.',
      convite_caducado: 'Esta ligação já caducou (cada uma serve 90 dias). Peça-nos outra, e obrigada pela paciência.',
      nao_existe: 'Não encontrámos a opinião desta ligação: pode já ter sido retirada.',
      muitos_envios: 'Foram enviadas muitas opiniões a partir desta ligação à internet. Tente de novo daqui a uma hora.',
      indisponivel: SEM_REDE,
    };
    const CAMPOS = {
      estrelas: 'Escolha quantas estrelas dá à peça.',
      texto: 'Escreva a sua opinião (pelo menos 10 letras).',
      nome: 'Escreva o seu nome, como quer que apareça.',
      artigo: 'Escolha a peça que comprou.',
      autorizo: 'Para publicarmos a sua opinião, marque a autorização.',
    };
    const pedirOutra = () => {
      const a = $('[data-passo="aviso"] a', escrever);
      if (!a) $('[data-passo="aviso"]', escrever).insertAdjacentHTML('beforeend', `<p><a href="${escH(escrever.dataset.whatsapp)}">Falar connosco pelo WhatsApp</a></p>`);
    };

    function valores() {
      const d = new FormData(form);
      return { nome: d.get('nome') || '', localidade: d.get('localidade') || '', texto: d.get('texto') || '', estrelas: Number(d.get('estrelas') || 0), artigo: d.get('artigo') || '', autorizo: form.elements.autorizo.checked, site: d.get('site') || '' };
    }
    function errar(campo, texto) {
      $$('[aria-invalid]', form).forEach((x) => x.removeAttribute('aria-invalid'));
      erro.textContent = texto; erro.hidden = !texto;
      if (!campo) return;
      const alvo = campo === 'estrelas' ? $('#op-e1') : campo === 'autorizo' ? form.elements.autorizo : form.elements[campo];
      if (alvo) { alvo.setAttribute('aria-invalid', 'true'); alvo.focus(); }
    }
    function conferir(v) {
      if (!$('[data-campo-artigo]', form).hidden && !v.artigo) return 'artigo';
      if (!(v.estrelas >= 1 && v.estrelas <= 5)) return 'estrelas';
      if (v.texto.trim().length < 10) return 'texto';
      if (!v.nome.trim()) return 'nome';
      if (!v.autorizo) return 'autorizo';
      return null;
    }
    function preencher(o) {
      form.reset();
      if (!o) return;
      form.elements.nome.value = o.nome || ''; form.elements.localidade.value = o.localidade || ''; form.elements.texto.value = o.texto || '';
      const r = $(`#op-e${o.estrelas}`); if (r) r.checked = true;
    }
    function sobre(artigo) {
      const nome = nomeDoArtigo(artigo);
      const s = $('[data-sobre]', form);
      s.hidden = !nome; s.textContent = nome ? `Sobre: ${nome}` : '';
      $('[data-campo-artigo]', form).hidden = Boolean(artigo);
    }

    async function abrirConvite(c) {
      modo = { c };
      mostrar('a-abrir', { focar: false });
      let r;
      try { r = await pedir('/opinioes/convite', { c }); } catch (_) { aviso(SEM_REDE); return; }
      if (!r.j.ok) { aviso(FRASES[r.j.erro] || SEM_REDE); pedirOutra(); return; }
      preencher(null); sobre(r.j.artigo || '');
      $('[data-enviar]', form).textContent = 'Enviar a opinião';
      erro.hidden = true;
      mostrar('formulario');
    }
    async function abrirMinha(e, mensagem = '') {
      modo = { e };
      mostrar('a-abrir', { focar: false });
      let r;
      try { r = await pedir('/opinioes/minha', { e }); } catch (_) { aviso(SEM_REDE); return; }
      if (!r.j.ok) { aviso(FRASES[r.j.erro] || SEM_REDE); return; }
      const o = r.j.opiniao;
      const estados = {
        pendente: 'A sua opinião está à espera de ser publicada (até 5 dias úteis depois de a enviar).',
        publicada: 'A sua opinião está publicada.',
        recusada: `Não publicámos a sua opinião porque: ${o.motivo || 'não cumpria as regras'} Pode alterá-la e enviá-la de novo.`,
      };
      let estado = estados[o.estado] || '';
      if (o.alteracao) estado += ' A alteração que fez está à espera de ser publicada; até lá fica a de antes.';
      if (o.motivoAlteracao) estado += ` A última alteração não foi publicada porque: ${o.motivoAlteracao}`;
      $('[data-minha-estado]', escrever).textContent = `${mensagem ? `${mensagem} ` : ''}${estado}`;
      const mostrada = o.alteracao ? { ...o, ...o.alteracao } : o;
      $('[data-minha-cartao]', escrever).innerHTML = `<li class="opiniao"><p class="opiniao__topo"><span class="estrelas" role="img" aria-label="${mostrada.estrelas} de 5 estrelas">${ESTRELAS(mostrada.estrelas)}</span></p><blockquote class="opiniao__texto"><p>${escH(mostrada.texto).replace(/\n/g, '<br>')}</p></blockquote><p class="opiniao__quem">${escH(mostrada.nome)}${mostrada.localidade ? `, ${escH(mostrada.localidade)}` : ''}${nomeDoArtigo(o.artigo) ? ` · ${escH(nomeDoArtigo(o.artigo))}` : ''}</p></li>`;
      const retirar = $('[data-retirar]', escrever);
      retirar.textContent = 'Retirar a opinião'; delete retirar.dataset.certeza;
      $('[data-alterar]', escrever).onclick = () => {
        preencher(mostrada); sobre(o.artigo);
        $('[data-enviar]', form).textContent = 'Enviar a alteração';
        erro.hidden = true; mostrar('formulario');
      };
      retirar.onclick = async () => {
        if (!retirar.dataset.certeza) { retirar.dataset.certeza = '1'; retirar.textContent = 'Sim, retirar de vez'; return; }
        retirar.disabled = true;
        try {
          const x = await pedir('/opinioes/retirar', { e });
          if (!x.j.ok) { aviso(FRASES[x.j.erro] || SEM_REDE); return; }
          history.replaceState(null, '', location.pathname);
          aviso('A sua opinião foi retirada do site. Obrigada por nos ter dito o que pensa.');
        } catch (_) { aviso(SEM_REDE); } finally { retirar.disabled = false; }
      };
      mostrar('minha');
    }

    // o erro sai quando a pessoa mexe no formulário (o seguinte só aparece ao enviar outra vez)
    const limparErro = () => { if (!erro.hidden) errar(null, ''); };
    form.addEventListener('input', limparErro);
    form.addEventListener('change', limparErro);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = valores();
      const falta = conferir(v);
      if (falta) { errar(falta, CAMPOS[falta]); return; }
      errar(null, '');
      const botao = $('[data-enviar]', form);
      botao.disabled = true;
      try {
        if (modo?.c) {
          const r = await pedir('/opinioes/enviar', { c: modo.c, ...v });
          if (!r.j.ok) { if (r.j.campo && CAMPOS[r.j.campo]) errar(r.j.campo, CAMPOS[r.j.campo]); else { aviso(FRASES[r.j.erro] || SEM_REDE); } return; }
          if (!r.j.edicao) { aviso('Obrigada!'); return; } // a armadilha (um robô): nada a guardar
          // a página passa a ser a da ligação de edição: guardar o separador guarda a ligação
          const ligacao = `${location.origin}${location.pathname}#e=${r.j.edicao}`;
          history.replaceState(null, '', `#e=${r.j.edicao}`);
          modo = { e: r.j.edicao };
          $('[data-ligacao]', escrever).value = ligacao;
          mostrar('enviada');
        } else if (modo?.e) {
          const r = await pedir('/opinioes/alterar', { e: modo.e, ...v });
          if (!r.j.ok) { if (r.j.campo && CAMPOS[r.j.campo]) errar(r.j.campo, CAMPOS[r.j.campo]); else { aviso(FRASES[r.j.erro] || SEM_REDE); } return; }
          await abrirMinha(modo.e, 'Alteração enviada.');
        }
      } catch (_) {
        errar(null, SEM_REDE);
      } finally {
        botao.disabled = false;
      }
    });
    $('[data-copiar]', escrever).addEventListener('click', async (ev) => {
      const botao = ev.currentTarget; // depois do await, o currentTarget já é null (memória currenttarget-depois-de-await)
      const campo = $('[data-ligacao]', escrever);
      try { await navigator.clipboard.writeText(campo.value); botao.textContent = 'Copiada'; } catch (_) { campo.select(); }
    });

    const ler = () => {
      const m = /^#([ce])=([A-Za-z0-9_-]{16,64})$/.exec(location.hash);
      if (!m) { modo = null; mostrar('sem-ligacao', { focar: false }); return; }
      if (m[1] === 'c') abrirConvite(m[2]); else abrirMinha(m[2]);
    };
    window.addEventListener('hashchange', ler);
    ler();
  }

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
