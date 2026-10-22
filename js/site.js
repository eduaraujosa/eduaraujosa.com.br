/* ==========================================================================
   eduaraujosa.com.br · v3
   Sem dependências. O conteúdo essencial está no HTML; este arquivo só
   acrescenta comportamento (menu, seção ativa, animação e Lifestyle).
   ========================================================================== */

/* Configuração das integrações da seção Lifestyle --------------------------- */
const LIFESTYLE = {
  instagram: {
    perfil: 'https://www.instagram.com/eduaraujosa',
    postShortcode: 'DY7HMK6kbZx', // post de @eduaraujosa (conferido em 22/10/2026)
  },
  soundcloud: {
    perfil: '', // PENDENTE: URL do perfil ou playlist do SoundCloud
    cor: '6D28D9',
    alturaPx: 450,
  },
  medium: {
    usuario: 'eduaraujosa',
    perfil: 'https://eduaraujosa.medium.com/',
    quantidade: 3,
    endpoint: 'api/medium.php', // relativo à página: funciona na raiz e em /v3-previa/
  },
};

/* LGPD: com false, Instagram e SoundCloud só carregam depois de um clique na fachada. */
const CONSENTIMENTO_EMBEDS = false;

/* Tempo máximo para um embed ou o feed responder antes do estado de erro. */
const TEMPO_LIMITE_MS = 8000;

(function () {
  'use strict';

  const raiz = document.documentElement;
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const temIO = 'IntersectionObserver' in window;

  /* Utilidades ------------------------------------------------------------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function icone(id, tamanho, classe) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'ico ' + classe);
    svg.setAttribute('width', tamanho);
    svg.setAttribute('height', tamanho);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  function linkExterno(classe, rotulo, href, rotuloOculto) {
    const a = el('a', classe, rotulo);
    a.setAttribute('href', href);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.appendChild(el('span', 'sr', (rotuloOculto || '') + ' (abre em nova aba)'));
    return a;
  }

  /* Executa fn uma vez, quando o elemento chega a 300 px da tela. */
  function aoAproximar(alvo, fn) {
    if (!temIO) { fn(); return; }
    const io = new IntersectionObserver(function (entradas) {
      if (entradas.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        fn();
      }
    }, { rootMargin: '300px 0px' });
    io.observe(alvo);
  }

  /* 1. Menu ----------------------------------------------------------------- */
  function iniciarMenu() {
    const nav = document.querySelector('.menu');
    if (!nav) return;
    const botao = nav.querySelector('.menu__botao');
    const lista = nav.querySelector('.menu__lista');

    function abrir() {
      nav.classList.add('menu--aberto');
      botao.setAttribute('aria-expanded', 'true');
    }
    function fechar(devolverFoco) {
      if (!nav.classList.contains('menu--aberto')) return;
      nav.classList.remove('menu--aberto');
      botao.setAttribute('aria-expanded', 'false');
      if (devolverFoco) botao.focus();
    }

    botao.addEventListener('click', function () {
      if (nav.classList.contains('menu--aberto')) fechar(false); else abrir();
    });
    lista.addEventListener('click', function (e) {
      if (e.target.closest('a')) fechar(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fechar(true);
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) fechar(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) {
      if (e.matches) fechar(false);
    });
  }

  /* 2. Item ativo do menu (seção visível) ----------------------------------- */
  function iniciarSecaoAtiva() {
    if (!temIO) return;
    const links = Array.from(document.querySelectorAll('.menu__lista a[href^="#"]'));
    const porId = new Map(links.map(function (a) { return [a.getAttribute('href').slice(1), a]; }));
    const secoes = Array.from(document.querySelectorAll('main section[id]'));
    const visiveis = new Set();

    function atualizar() {
      // A seção ativa é a última (na ordem da página) que cruza a faixa central da tela.
      let ativa = null;
      secoes.forEach(function (s) { if (visiveis.has(s.id)) ativa = s.id; });
      links.forEach(function (a) { a.classList.remove('ativo'); a.removeAttribute('aria-current'); });
      const link = ativa && porId.get(ativa);
      if (link) {
        link.classList.add('ativo');
        link.setAttribute('aria-current', 'true');
      }
    }

    const io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) visiveis.add(e.target.id); else visiveis.delete(e.target.id);
      });
      atualizar();
    }, { rootMargin: '-40% 0px -55% 0px' });

    secoes.forEach(function (s) { io.observe(s); });
  }

  /* 3. Entrada suave dos capítulos da Trajetória ---------------------------- */
  function iniciarAnimacaoTrajetoria() {
    if (!temIO || movimentoReduzido.matches) return;
    const capitulos = Array.from(document.querySelectorAll('.capitulo'));
    const io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visivel');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    capitulos.forEach(function (c) {
      // Só esconde o que ainda está abaixo da dobra: nada visível pisca ou some.
      if (c.getBoundingClientRect().top > window.innerHeight) {
        c.classList.add('anima');
        io.observe(c);
      }
    });
  }

  /* 4. Lifestyle: estados das molduras -------------------------------------- */
  function limpar(moldura) {
    while (moldura.firstChild) moldura.removeChild(moldura.firstChild);
  }

  function estadoCarregando(moldura, variante) {
    const c = el('div', 'carregando');
    c.setAttribute('role', 'status');
    c.appendChild(el('span', 'sr', 'Carregando…'));
    if (variante === 'instagram') {
      c.appendChild(el('div', 'carregando__bloco carregando__bloco--topo'));
      c.appendChild(el('div', 'carregando__bloco carregando__bloco--grande'));
      c.appendChild(el('div', 'carregando__bloco carregando__bloco--linha'));
      c.appendChild(el('div', 'carregando__bloco carregando__bloco--linha curta'));
    } else {
      c.appendChild(el('div', 'carregando__bloco carregando__bloco--grande'));
      c.appendChild(el('div', 'carregando__bloco carregando__bloco--linha'));
      c.appendChild(el('div', 'carregando__bloco carregando__bloco--linha'));
      c.appendChild(el('div', 'carregando__bloco carregando__bloco--linha curta'));
    }
    moldura.appendChild(c);
    moldura.setAttribute('aria-busy', 'true');
    return c;
  }

  function estadoErro(moldura, texto, rotulo, href, plataforma) {
    limpar(moldura);
    moldura.removeAttribute('aria-busy');
    moldura.dataset.estado = 'erro';
    const box = el('div', 'estado estado--erro');
    box.setAttribute('role', 'status');
    box.appendChild(el('p', 'estado__texto', texto));
    const a = linkExterno('estado__link', rotulo, href, ' no ' + plataforma);
    a.appendChild(icone('i-abre', 16, 'ico-abre'));
    box.appendChild(a);
    moldura.appendChild(box);
  }

  function estadoFachada(moldura, plataforma, aoCarregar) {
    limpar(moldura);
    moldura.dataset.estado = 'fachada';
    const box = el('div', 'fachada');
    box.appendChild(el('p', 'fachada__rotulo', 'Conteúdo externo'));
    box.appendChild(el('p', 'fachada__texto', 'Ao carregar, o ' + plataforma + ' pode registrar cookies no seu navegador.'));
    const botao = el('button', 'botao', 'Carregar conteúdo do ' + plataforma);
    botao.type = 'button';
    botao.addEventListener('click', function () {
      aoCarregar();
      // Leva o foco para a moldura, para não se perder quando o botão sai da página.
      moldura.setAttribute('tabindex', '-1');
      moldura.focus({ preventScroll: true });
    });
    box.appendChild(botao);
    moldura.appendChild(box);
  }

  /*
   * Cria o iframe com altura reservada, mostra o esqueleto enquanto carrega e
   * cai no estado de erro se não houver confirmação em TEMPO_LIMITE_MS.
   * confirmar(iframe, ok): opcional; quando existe, só ela marca o sucesso
   * (o evento "load" também dispara em páginas de erro).
   */
  function montarIframe(moldura, opcoes) {
    limpar(moldura);
    moldura.dataset.estado = 'carregando';
    const carregando = estadoCarregando(moldura, opcoes.variante);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', opcoes.titulo);
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    Object.keys(opcoes.atributos || {}).forEach(function (k) { iframe.setAttribute(k, opcoes.atributos[k]); });

    let resolvido = false;
    function sucesso() {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(relogio);
      iframe.classList.add('pronto');
      carregando.remove();
      moldura.removeAttribute('aria-busy');
      moldura.dataset.estado = 'ok';
    }
    function falha() {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(relogio);
      if (opcoes.aoFalhar) opcoes.aoFalhar();
      opcoes.erro();
    }
    const relogio = setTimeout(falha, TEMPO_LIMITE_MS);

    if (opcoes.confirmar) {
      opcoes.confirmar(iframe, sucesso);
    } else {
      iframe.addEventListener('load', sucesso);
    }
    iframe.addEventListener('error', falha);

    iframe.setAttribute('src', opcoes.src);
    moldura.appendChild(iframe);
  }

  /* 4a. Instagram ----------------------------------------------------------- */
  function iniciarInstagram() {
    const moldura = document.querySelector('[data-embed="instagram"]');
    if (!moldura) return;
    const cfg = LIFESTYLE.instagram;
    document.querySelectorAll('[data-ig-perfil]').forEach(function (a) { a.setAttribute('href', cfg.perfil); });

    function erro() {
      estadoErro(moldura, 'Não foi possível carregar o post.', 'Ver no Instagram', cfg.perfil, 'Instagram');
    }

    if (!/^[A-Za-z0-9_-]{5,20}$/.test(cfg.postShortcode || '')) { erro(); return; }

    let ouvinte = null;
    function carregar() {
      montarIframe(moldura, {
        variante: 'instagram',
        titulo: 'Post do Instagram de @eduaraujosa',
        src: 'https://www.instagram.com/p/' + encodeURIComponent(cfg.postShortcode) + '/embed/',
        atributos: { width: '320', height: '568', frameborder: '0', scrolling: 'no', allowtransparency: 'true' },
        // O embed do Instagram avisa a página quando o post foi montado (mensagens MOUNTED/MEASURE).
        // Sem esse aviso (post removido, privado ou domínio bloqueado), vale o estado de erro.
        confirmar: function (iframe, ok) {
          ouvinte = function (e) {
            if (e.origin !== 'https://www.instagram.com' || e.source !== iframe.contentWindow) return;
            let dados = e.data;
            if (typeof dados === 'string') { try { dados = JSON.parse(dados); } catch (_) { return; } }
            if (dados && (dados.type === 'MOUNTED' || dados.type === 'MEASURE')) {
              window.removeEventListener('message', ouvinte);
              ok();
            }
          };
          window.addEventListener('message', ouvinte);
        },
        aoFalhar: function () { if (ouvinte) window.removeEventListener('message', ouvinte); },
        erro: erro,
      });
    }

    if (CONSENTIMENTO_EMBEDS) {
      limpar(moldura);
      estadoCarregando(moldura, 'instagram');
      aoAproximar(moldura, carregar);
    } else {
      estadoFachada(moldura, 'Instagram', carregar);
    }
  }

  /* 4b. SoundCloud ---------------------------------------------------------- */
  function urlPlayerDireto(perfil, cor) {
    return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(perfil) +
      '&color=%23' + cor + '&auto_play=false&show_comments=false&visual=false';
  }

  function srcPorOEmbed(perfil, cor) {
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const t = ctrl ? setTimeout(function () { ctrl.abort(); }, TEMPO_LIMITE_MS) : null;
    const params = new URLSearchParams({
      format: 'json', url: perfil, maxheight: '450', color: cor, auto_play: 'false', show_comments: 'false',
    });
    return fetch('https://soundcloud.com/oembed?' + params.toString(), { signal: ctrl ? ctrl.signal : undefined, credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('oEmbed ' + r.status); return r.json(); })
      .then(function (j) {
        // Não injeta o HTML recebido: só extrai o src do iframe e o valida.
        const doc = new DOMParser().parseFromString(String(j && j.html || ''), 'text/html');
        const frame = doc.querySelector('iframe');
        const src = frame ? frame.getAttribute('src') : '';
        if (!src || src.indexOf('https://w.soundcloud.com/player/') !== 0) throw new Error('src inválido');
        const u = new URL(src);
        u.searchParams.set('auto_play', 'false');
        return u.toString();
      })
      .finally(function () { if (t) clearTimeout(t); });
  }

  function iniciarSoundCloud() {
    const moldura = document.querySelector('[data-embed="soundcloud"]');
    if (!moldura) return;
    const cfg = LIFESTYLE.soundcloud;
    const perfil = (cfg.perfil || '').trim();
    const links = document.querySelectorAll('[data-sc-link]');

    // Perfil pendente: mantém o estado "Em breve" do HTML, sem chamadas de rede.
    let valido = false;
    try {
      const u = new URL(perfil);
      valido = u.protocol === 'https:' && /(^|\.)soundcloud\.com$/.test(u.hostname) && !/^\/discover\b/.test(u.pathname);
    } catch (_) { valido = false; }
    if (!valido) {
      links.forEach(function (a) { a.hidden = true; });
      return;
    }

    links.forEach(function (a) { a.setAttribute('href', perfil); a.hidden = false; });

    function erro() {
      estadoErro(moldura, 'O player não carregou.', 'Ouvir no SoundCloud', perfil, 'SoundCloud');
    }

    function carregar() {
      limpar(moldura);
      estadoCarregando(moldura, 'soundcloud');
      srcPorOEmbed(perfil, cfg.cor)
        .catch(function () { return urlPlayerDireto(perfil, cfg.cor); })
        .then(function (src) {
          montarIframe(moldura, {
            variante: 'soundcloud',
            titulo: 'Player do SoundCloud com faixas de Eduardo Araújo',
            src: src,
            atributos: { width: '100%', height: String(cfg.alturaPx), frameborder: '0', scrolling: 'no', allow: 'encrypted-media' },
            erro: erro,
          });
        });
    }

    if (CONSENTIMENTO_EMBEDS) {
      limpar(moldura);
      estadoCarregando(moldura, 'soundcloud');
      aoAproximar(moldura, carregar);
    } else {
      estadoFachada(moldura, 'SoundCloud', carregar);
    }
  }

  /* 4c. Medium -------------------------------------------------------------- */
  const HOSTS_LINK = ['medium.com', 'eduaraujosa.medium.com'];
  const HOSTS_IMAGEM = ['cdn-images-1.medium.com', 'miro.medium.com'];

  function urlSegura(valor, hosts) {
    try {
      const u = new URL(String(valor));
      if (u.protocol !== 'https:' || hosts.indexOf(u.hostname) === -1) return null;
      return u.toString();
    } catch (_) { return null; }
  }

  // "6 AGO 2026": dia, mês abreviado e ano, sem "de" nem ponto (a caixa alta vem do CSS).
  function formatarData(d) {
    const partes = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Recife' }).formatToParts(d);
    const pega = function (tipo) {
      const p = partes.find(function (x) { return x.type === tipo; });
      return p ? p.value.replace('.', '') : '';
    };
    return [pega('day'), pega('month'), pega('year')].join(' ');
  }

  // Sigla em caixa alta do título (ex.: "PISA") ou as iniciais das duas primeiras palavras longas.
  function iniciais(titulo) {
    const palavras = String(titulo).split(/\s+/).filter(Boolean);
    const sigla = palavras.filter(function (p) { return /^[A-ZÀ-Ý0-9]{2,6}$/.test(p.replace(/[^\wÀ-ÿ]/g, '')); }).pop();
    if (sigla) return sigla.replace(/[^\wÀ-ÿ]/g, '');
    return palavras.filter(function (p) { return p.length > 3; }).slice(0, 2)
      .map(function (p) { return p.charAt(0).toUpperCase(); }).join('') || 'M';
  }

  function blocoIniciais(titulo) {
    const b = el('div', 'post__mini post__mini--iniciais', iniciais(titulo));
    b.setAttribute('aria-hidden', 'true');
    return b;
  }

  function cardPost(item) {
    const li = el('li', 'post');
    if (item.miniatura) {
      const img = el('img', 'post__mini');
      img.setAttribute('src', item.miniatura);
      img.setAttribute('alt', '');
      img.setAttribute('width', '344');
      img.setAttribute('height', '190');
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      img.setAttribute('referrerpolicy', 'no-referrer');
      img.addEventListener('error', function () { img.replaceWith(blocoIniciais(item.titulo)); });
      li.appendChild(img);
    } else {
      li.appendChild(blocoIniciais(item.titulo));
    }
    const p = el('p', 'post__data');
    const time = el('time', null, formatarData(item.data));
    time.setAttribute('datetime', item.data.toISOString().slice(0, 10));
    p.appendChild(time);
    li.appendChild(p);
    li.appendChild(el('h4', 'post__titulo', item.titulo));
    const a = linkExterno('post__link', 'Ler no Medium', item.link, ': ' + item.titulo);
    a.appendChild(icone('i-abre', 14, 'ico-abre ico-abre--p'));
    li.appendChild(a);
    return li;
  }

  function validarItens(json, quantidade) {
    const lista = json && Array.isArray(json.items) ? json.items : [];
    const itens = [];
    for (let i = 0; i < lista.length && itens.length < quantidade; i++) {
      const it = lista[i] || {};
      const titulo = typeof it.titulo === 'string' ? it.titulo.trim() : '';
      const link = urlSegura(it.link, HOSTS_LINK);
      const data = new Date(it.data);
      if (!titulo || !link || isNaN(data.getTime())) continue;
      itens.push({ titulo: titulo, link: link, data: data, miniatura: urlSegura(it.miniatura, HOSTS_IMAGEM) });
    }
    return itens;
  }

  function iniciarMedium() {
    const feed = document.querySelector('[data-embed="medium"]');
    if (!feed) return;
    const lista = feed.querySelector('.posts');
    const cfg = LIFESTYLE.medium;

    function falhou() {
      // Mantém o card de base (PISA) e troca os esqueletos por um aviso com link.
      lista.querySelectorAll('.post--esqueleto').forEach(function (n) { n.remove(); });
      const aviso = el('li', 'post post--aviso');
      aviso.setAttribute('role', 'status');
      aviso.appendChild(el('p', null, 'Não foi possível carregar os textos agora.'));
      const a = linkExterno('estado__link', 'Ler no Medium', cfg.perfil, ' no Medium');
      a.appendChild(icone('i-abre', 16, 'ico-abre'));
      aviso.appendChild(a);
      lista.appendChild(aviso);
      feed.removeAttribute('aria-busy');
      feed.dataset.estado = 'erro';
    }

    function carregar() {
      feed.setAttribute('aria-busy', 'true');
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const t = setTimeout(function () { if (ctrl) ctrl.abort(); }, TEMPO_LIMITE_MS);
      fetch(cfg.endpoint, { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (json) {
          const itens = validarItens(json, cfg.quantidade);
          if (!itens.length) throw new Error('feed vazio');
          const novos = itens.map(cardPost);
          lista.replaceChildren.apply(lista, novos);
          feed.removeAttribute('aria-busy');
          feed.dataset.estado = 'ok';
        })
        .catch(falhou)
        .finally(function () { clearTimeout(t); });
    }

    aoAproximar(feed, carregar);
  }

  /* Início ------------------------------------------------------------------ */
  function iniciar() {
    iniciarMenu();
    iniciarSecaoAtiva();
    iniciarAnimacaoTrajetoria();
    iniciarInstagram();
    iniciarSoundCloud();
    iniciarMedium();
    raiz.classList.add('js-pronto');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
