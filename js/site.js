/* eduaraujosa.com.br · v3
   JavaScript puro, sem dependências. Tudo aqui é melhoria progressiva:
   sem JS, o conteúdo e os links continuam no HTML. */

'use strict';

/* ==========================================================
   Configuração das integrações da seção Lifestyle
   ========================================================== */

const LIFESTYLE = {
  instagram: {
    perfil: 'https://www.instagram.com/eduaraujosa',
    postShortcode: 'DY7HMK6kbZx',
    // false = /embed/ (só a imagem e o cabeçalho, cabe em 320×568);
    // true  = /embed/captioned/ (com legenda; fica mais alto e é recortado).
    legenda: false,
  },
  soundcloud: {
    // Faixa escolhida: Chisari - El Baile.
    perfil: 'https://soundcloud.com/chisari/chisari-el-baile',
    // Player exatamente como gerado pelo botão "Incorporar" do SoundCloud.
    // Vazio = o site monta o player pelo oEmbed a partir de "perfil".
    playerSrc: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A1479613348&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true',
    titulo: 'Player do SoundCloud: Chisari - El Baile',
    cor: '6D28D9', // usada só quando o player é montado pelo oEmbed
    alturaPx: 300,
  },
  medium: {
    usuario: 'eduaraujosa',
    perfil: 'https://eduaraujosa.medium.com/',
    // Máximo de textos do Medium. Somados aos artigos fixos do LinkedIn,
    // o total é ajustado para fechar linhas completas de 3 cards.
    quantidade: 4,
    // Caminho relativo à página: funciona na raiz e na pasta de prévia.
    endpoint: 'api/medium.php',
  },
};

// LGPD: com false, Instagram e SoundCloud só carregam depois de um clique
// na "fachada". O feed do Medium vem do próprio domínio e não depende disso.
const CONSENTIMENTO_EMBEDS = false;

const TEMPO_LIMITE_MS = 8000;

/* ========================================================== */

const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
}

function icone(id, tamanho, classe) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('width', String(tamanho));
  svg.setAttribute('height', String(tamanho));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', '#' + id);
  svg.appendChild(use);
  return svg;
}

function textoOculto(texto) {
  return criar('span', 'sr', texto);
}

function linkExterno(classe, href, rotulo, ocultoExtra) {
  const a = criar('a', classe, rotulo);
  a.setAttribute('href', href);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener noreferrer');
  a.appendChild(textoOculto((ocultoExtra || '') + ' (abre em nova aba)'));
  return a;
}

/* ---------- Menu (mobile) ---------- */

function iniciarMenu() {
  const menu = document.querySelector('.menu');
  if (!menu) return;
  const botao = menu.querySelector('.menu__botao');
  const lista = menu.querySelector('.menu__lista');

  function fechar(devolverFoco) {
    menu.classList.remove('menu--aberto');
    botao.setAttribute('aria-expanded', 'false');
    if (devolverFoco) botao.focus();
  }

  botao.addEventListener('click', () => {
    const aberto = botao.getAttribute('aria-expanded') === 'true';
    if (aberto) {
      fechar(false);
    } else {
      menu.classList.add('menu--aberto');
      botao.setAttribute('aria-expanded', 'true');
    }
  });

  lista.addEventListener('click', (e) => {
    if (e.target.closest('a')) fechar(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('menu--aberto')) fechar(true);
  });

  document.addEventListener('click', (e) => {
    if (menu.classList.contains('menu--aberto') && !menu.contains(e.target)) fechar(false);
  });
}

/* ---------- Item ativo do menu ---------- */

function iniciarMenuAtivo() {
  if (!('IntersectionObserver' in window)) return;
  const links = new Map();
  document.querySelectorAll('.menu__lista a[href^="#"]').forEach((a) => {
    links.set(a.getAttribute('href').slice(1), a);
  });
  const secoes = ['inicio', 'sobre', 'trajetoria', 'publicacoes', 'lifestyle', 'contato']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const visiveis = new Set();

  function atualizar() {
    // A seção ativa é a última (na ordem da página) que cruza a faixa central.
    let atual = null;
    secoes.forEach((s) => { if (visiveis.has(s.id)) atual = s.id; });
    // No fim da página, o contato fica ativo mesmo que seja curto.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) atual = 'contato';
    links.forEach((a, id) => a.classList.toggle('ativo', id === atual));
  }

  const io = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) visiveis.add(e.target.id);
      else visiveis.delete(e.target.id);
    });
    atualizar();
  }, { rootMargin: '-35% 0px -60% 0px' });

  secoes.forEach((s) => io.observe(s));
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) atualizar();
  }, { passive: true });
}

/* ---------- Trajetória: entrada suave ---------- */

function iniciarAnimacaoTrajetoria() {
  if (reduzMovimento.matches || !('IntersectionObserver' in window)) return;
  const linha = document.querySelector('.linha-tempo');
  if (!linha) return;
  const capitulos = linha.querySelectorAll('.capitulo');

  // Só esconde o que ainda está abaixo da dobra; o que já está visível fica visível.
  const limite = window.innerHeight;
  capitulos.forEach((c) => {
    if (c.getBoundingClientRect().top < limite) c.classList.add('visivel');
  });
  linha.classList.add('anima');

  const io = new IntersectionObserver((entradas, obs) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visivel');
        obs.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  capitulos.forEach((c) => { if (!c.classList.contains('visivel')) io.observe(c); });
}

/* ---------- Lifestyle: utilitários de embed ---------- */

function quandoPerto(el, fn) {
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) {
      io.disconnect();
      fn();
    }
  }, { rootMargin: '300px 0px' });
  io.observe(el);
}

function limparMoldura(moldura) {
  moldura.querySelectorAll('.estado, .fachada, .carregando, iframe').forEach((n) => n.remove());
}

function mostrarCarregando(moldura, rotulo) {
  const bloco = criar('div', 'carregando');
  bloco.setAttribute('role', 'status');
  bloco.appendChild(textoOculto(rotulo));
  const l1 = criar('div', 'esqueleto esqueleto--linha');
  l1.style.width = '45%';
  const meio = criar('div', 'esqueleto carregando__bloco');
  const l2 = criar('div', 'esqueleto esqueleto--linha');
  l2.style.width = '80%';
  const l3 = criar('div', 'esqueleto esqueleto--linha');
  l3.style.width = '60%';
  [l1, meio, l2, l3].forEach((n) => { n.setAttribute('aria-hidden', 'true'); bloco.appendChild(n); });
  moldura.appendChild(bloco);
}

function mostrarErro(moldura, texto, rotuloLink, href) {
  limparMoldura(moldura);
  const estado = criar('div', 'estado');
  estado.setAttribute('role', 'status');
  estado.appendChild(criar('p', 'estado__texto', texto));
  const a = linkExterno('estado__link', href, rotuloLink);
  a.appendChild(icone('i-abre', 16, 'ico ico-abre'));
  estado.appendChild(a);
  moldura.appendChild(estado);
}

function mostrarFachada(moldura, plataforma, aoClicar) {
  limparMoldura(moldura);
  const fachada = criar('div', 'fachada');
  fachada.appendChild(criar('p', 'fachada__rotulo', 'Conteúdo externo'));
  fachada.appendChild(criar('p', 'fachada__texto', 'Ao carregar, o ' + plataforma + ' pode registrar cookies no seu navegador.'));
  const botao = criar('button', 'botao', 'Carregar conteúdo do ' + plataforma);
  botao.type = 'button';
  botao.addEventListener('click', () => aoClicar(true));
  fachada.appendChild(botao);
  moldura.appendChild(fachada);
}

/* Cria o iframe e espera o sinal de que o conteúdo da plataforma realmente
   carregou: Instagram e SoundCloud enviam uma mensagem (postMessage) ao
   montar o embed. O evento "load" não serve como prova, porque ele também
   dispara quando o navegador mostra uma página de erro dentro do iframe.
   Sem esse sinal em 8 s, o iframe é removido e entra o estado de erro. */
function carregarIframe(moldura, opcoes) {
  limparMoldura(moldura);
  mostrarCarregando(moldura, opcoes.rotuloCarregando);

  const iframe = document.createElement('iframe');
  Object.entries(opcoes.atributos).forEach(([k, v]) => iframe.setAttribute(k, v));
  iframe.setAttribute('title', opcoes.titulo);
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

  let resolvido = false;

  function encerrar() {
    resolvido = true;
    window.clearTimeout(timer);
    window.removeEventListener('message', aoReceber);
  }

  function sucesso() {
    if (resolvido) return;
    encerrar();
    iframe.classList.add('pronto');
    const carregando = moldura.querySelector('.carregando');
    if (carregando) carregando.remove();
  }

  function falha() {
    if (resolvido) return;
    encerrar();
    opcoes.aoFalhar();
  }

  function aoReceber(e) {
    if (e.origin !== opcoes.origemMensagem || e.source !== iframe.contentWindow) return;
    let dados = e.data;
    if (typeof dados === 'string') {
      try { dados = JSON.parse(dados); } catch (erro) { return; }
    }
    if (dados && opcoes.mensagemDeSucesso(dados)) sucesso();
  }

  const timer = window.setTimeout(falha, TEMPO_LIMITE_MS);
  window.addEventListener('message', aoReceber);
  iframe.addEventListener('error', falha);

  iframe.setAttribute('src', opcoes.src);
  moldura.appendChild(iframe);
}

/* ---------- Instagram ---------- */

function iniciarInstagram() {
  const cfg = LIFESTYLE.instagram;
  const moldura = document.querySelector('[data-embed="instagram"]');
  if (!moldura) return;

  document.querySelectorAll('[data-ig-perfil]').forEach((a) => a.setAttribute('href', cfg.perfil));

  const falhar = () => mostrarErro(moldura, 'Não foi possível carregar o post.', 'Ver no Instagram', cfg.perfil);

  if (!/^[A-Za-z0-9_-]{5,40}$/.test(cfg.postShortcode || '')) {
    falhar();
    return;
  }

  const carregar = () => carregarIframe(moldura, {
    src: 'https://www.instagram.com/p/' + encodeURIComponent(cfg.postShortcode) + '/embed/' + (cfg.legenda ? 'captioned/' : ''),
    titulo: 'Post do Instagram de @eduaraujosa',
    rotuloCarregando: 'Carregando o post do Instagram',
    atributos: { width: '320', height: '568', frameborder: '0', scrolling: 'no', allowtransparency: 'true' },
    origemMensagem: 'https://www.instagram.com',
    // O embed avisa com { type: "MEASURE" } e { type: "MOUNTED" } quando o post aparece.
    mensagemDeSucesso: (d) => d.type === 'MEASURE' || d.type === 'MOUNTED',
    aoFalhar: falhar,
  });

  if (CONSENTIMENTO_EMBEDS) {
    limparMoldura(moldura);
    mostrarCarregando(moldura, 'Carregando o post do Instagram');
    quandoPerto(moldura, carregar);
  } else {
    mostrarFachada(moldura, 'Instagram', carregar);
  }
}

/* ---------- SoundCloud ---------- */

function srcPlayerSoundCloud(perfil, cor) {
  return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(perfil) +
    '&color=' + encodeURIComponent('#' + cor) +
    '&auto_play=false&show_comments=false&visual=false';
}

async function obterSrcSoundCloud(cfg) {
  const url = 'https://soundcloud.com/oembed?format=json' +
    '&url=' + encodeURIComponent(cfg.perfil) +
    '&maxheight=' + cfg.alturaPx +
    '&color=' + cfg.cor +
    '&auto_play=false&show_comments=false';
  const controle = new AbortController();
  const timer = window.setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resp = await fetch(url, { signal: controle.signal, credentials: 'omit' });
    if (!resp.ok) throw new Error('oEmbed ' + resp.status);
    const dados = await resp.json();
    // Não injeta o HTML do oEmbed: só extrai e valida o src do iframe.
    const tpl = document.createElement('template');
    tpl.innerHTML = typeof dados.html === 'string' ? dados.html : '';
    const iframe = tpl.content.querySelector('iframe');
    const src = iframe ? iframe.getAttribute('src') || '' : '';
    if (src.indexOf('https://w.soundcloud.com/player/') !== 0) throw new Error('src inválido');
    return src;
  } catch (e) {
    // Alternativa sem chamada de rede extra.
    return srcPlayerSoundCloud(cfg.perfil, cfg.cor);
  } finally {
    window.clearTimeout(timer);
  }
}

function iniciarSoundCloud() {
  const cfg = LIFESTYLE.soundcloud;
  const moldura = document.querySelector('[data-embed="soundcloud"]');
  if (!moldura) return;

  // Sem URL válida: mantém o conteúdo do HTML e não chama a API.
  const perfil = (cfg.perfil || '').trim();
  if (!/^https:\/\/(www\.|m\.)?soundcloud\.com\/[^\s]+$/.test(perfil) || /soundcloud\.com\/discover/.test(perfil)) return;
  const playerSrc = (cfg.playerSrc || '').trim();
  const srcFixo = playerSrc.indexOf('https://w.soundcloud.com/player/') === 0 ? playerSrc : '';

  document.querySelectorAll('[data-sc-link]').forEach((a) => {
    a.setAttribute('href', perfil);
    a.hidden = false;
  });

  const falhar = () => mostrarErro(moldura, 'O player não carregou.', 'Ouvir no SoundCloud', perfil);

  const carregar = async () => {
    limparMoldura(moldura);
    mostrarCarregando(moldura, 'Carregando o player do SoundCloud');
    const src = srcFixo || await obterSrcSoundCloud({ ...cfg, perfil });
    carregarIframe(moldura, {
      src,
      titulo: cfg.titulo || 'Player do SoundCloud',
      rotuloCarregando: 'Carregando o player do SoundCloud',
      atributos: { width: '100%', height: String(cfg.alturaPx), frameborder: 'no', scrolling: 'no', allow: 'autoplay; encrypted-media' },
      origemMensagem: 'https://w.soundcloud.com',
      // O widget envia { method: "ready" } quando o player está pronto.
      mensagemDeSucesso: (d) => d.method === 'ready',
      aoFalhar: falhar,
    });
  };

  if (CONSENTIMENTO_EMBEDS) {
    limparMoldura(moldura);
    mostrarCarregando(moldura, 'Carregando o player do SoundCloud');
    quandoPerto(moldura, carregar);
  } else {
    mostrarFachada(moldura, 'SoundCloud', carregar);
  }
}

/* ---------- Medium ---------- */

const HOSTS_LINK_MEDIUM = ['medium.com', 'eduaraujosa.medium.com'];
const HOSTS_MINIATURA_MEDIUM = ['cdn-images-1.medium.com', 'miro.medium.com'];

function urlSegura(valor, hosts) {
  try {
    const u = new URL(valor);
    return u.protocol === 'https:' && hosts.indexOf(u.hostname) !== -1 ? u.href : null;
  } catch (e) {
    return null;
  }
}

// "6 AGO 2026": dia, mês abreviado e ano (a caixa alta vem do CSS).
function formatarData(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const partes = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Recife',
  }).formatToParts(d);
  const pega = (tipo) => (partes.find((p) => p.type === tipo) || {}).value || '';
  return [pega('day'), pega('month').replace('.', ''), pega('year')].join(' ');
}

// Sem miniatura: usa uma sigla em caixa alta do título (ex.: "PISA");
// senão, as iniciais das duas primeiras palavras longas.
function iniciais(titulo) {
  const sigla = (titulo.match(/\b[A-ZÀ-Ý]{2,6}\b/g) || []).pop();
  if (sigla) return sigla;
  const palavras = titulo.split(/\s+/).filter((p) => p.length > 3);
  return palavras.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'M';
}

function cardPost(item) {
  const li = criar('li', 'post');
  const titulo = String(item.titulo || '').trim();
  const miniatura = item.miniatura ? urlSegura(item.miniatura, HOSTS_MINIATURA_MEDIUM) : null;

  if (miniatura) {
    const img = criar('img', 'post__mini');
    img.setAttribute('src', miniatura);
    img.setAttribute('alt', '');
    img.setAttribute('width', '360');
    img.setAttribute('height', '190');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.addEventListener('error', () => {
      const bloco = criar('div', 'post__mini post__mini--iniciais', iniciais(titulo));
      bloco.setAttribute('aria-hidden', 'true');
      img.replaceWith(bloco);
    });
    li.appendChild(img);
  } else {
    const bloco = criar('div', 'post__mini post__mini--iniciais', iniciais(titulo));
    bloco.setAttribute('aria-hidden', 'true');
    li.appendChild(bloco);
  }

  const dataP = criar('p', 'post__data');
  const time = criar('time', null, formatarData(item.data));
  if (item.data) time.setAttribute('datetime', String(item.data));
  dataP.appendChild(time);
  li.appendChild(dataP);

  li.appendChild(criar('h4', 'post__titulo', titulo));

  const link = linkExterno('post__link', item.link, 'Ler no Medium', ': ' + titulo);
  link.appendChild(icone('i-abre', 14, 'ico ico-abre ico-abre--p'));
  li.appendChild(link);
  return li;
}

// Quantos textos do Medium mostrar para que, somados aos cards fixos
// (LinkedIn), a grade feche em linhas completas de 3. Mínimo de 1.
function quantosMedium(disponiveis, fixos) {
  let n = Math.min(disponiveis, LIFESTYLE.medium.quantidade);
  while (n > 1 && (n + fixos) % 3 !== 0) n -= 1;
  return n;
}

async function carregarMedium(feed) {
  const lista = feed.querySelector('.posts');
  const fixos = lista.querySelectorAll('.post--fixo');
  const controle = new AbortController();
  const timer = window.setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resp = await fetch(LIFESTYLE.medium.endpoint, {
      signal: controle.signal,
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const dados = await resp.json();
    const validos = (Array.isArray(dados.items) ? dados.items : [])
      .map((i) => ({ ...i, link: urlSegura(i && i.link, HOSTS_LINK_MEDIUM) }))
      .filter((i) => i.link && typeof i.titulo === 'string' && i.titulo.trim());
    const itens = validos.slice(0, quantosMedium(validos.length, fixos.length));

    if (!itens.length) throw new Error(dados.erro || 'feed vazio');

    // Troca só os cards do Medium; os do LinkedIn ficam depois deles.
    const frag = document.createDocumentFragment();
    itens.forEach((i) => frag.appendChild(cardPost(i)));
    fixos.forEach((n) => frag.appendChild(n));
    lista.replaceChildren(frag);
    lista.setAttribute('data-estado', 'carregado');
  } catch (e) {
    // Mantém o card de base (PISA) e os do LinkedIn: a janela continua completa.
    lista.setAttribute('data-estado', 'erro');
  } finally {
    window.clearTimeout(timer);
  }
}

function iniciarMedium() {
  const feed = document.querySelector('[data-embed="medium"]');
  if (!feed || !window.fetch) return;
  quandoPerto(feed, () => carregarMedium(feed));
}

/* ---------- Início ---------- */

function iniciar() {
  iniciarMenu();
  iniciarMenuAtivo();
  iniciarAnimacaoTrajetoria();
  iniciarInstagram();
  iniciarSoundCloud();
  iniciarMedium();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
