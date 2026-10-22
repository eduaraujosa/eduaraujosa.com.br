#!/usr/bin/env node
// Atualiza, no index.html, os blocos da Trajetória e das Publicações
// a partir de data/trajetoria.json e data/publicacoes.json.
//
// Uso (na raiz do repositório):  node ferramentas/gerar-listas.mjs
//
// Não é uma etapa de build: o index.html continua sendo HTML estático e
// pode ser editado à mão. O script só reescreve o trecho entre os
// marcadores <!-- trajetoria:inicio --> … <!-- trajetoria:fim --> e
// <!-- publicacoes:inicio --> … <!-- publicacoes:fim -->.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const NOVA_ABA = '<span class="sr"> (abre em nova aba)</span>';
const SETA = '<svg class="ico ico-seta" width="20" height="20" aria-hidden="true" focusable="false"><use href="#i-seta"/></svg>';

function capitulo(c, i, total) {
  const lado = i % 2 === 0 ? 'esquerda' : 'direita';
  const ultimo = i === total - 1 ? ' capitulo--atual' : '';
  const id = `cap-${c.ano}`;
  const foto = c.foto
    ? `
          <figure class="capitulo__foto">
            <img src="${esc(c.foto)}" alt="${esc(c.fotoAlt || '')}" width="360" height="240" loading="lazy" decoding="async">
          </figure>`
    : '';
  return `
        <li class="capitulo capitulo--${lado}${ultimo}">
          <article class="capitulo__card dobra dobra--30" aria-labelledby="${id}">
            <p class="capitulo__ano">${esc(c.ano)}</p>
            <h3 class="capitulo__titulo" id="${id}">${esc(c.titulo)}</h3>
            <p class="capitulo__lugar">${esc(c.lugar)}</p>
            <p class="capitulo__texto">${esc(c.texto)}</p>
          </article>
          <span class="capitulo__marcador" aria-hidden="true"></span>${foto}
        </li>`;
}

function publicacao(p, i) {
  const id = `pub-${i + 1}`;
  // Espaço inseparável em "ISBN 978…", "p. 124", "v. 10" etc., para não quebrar a linha no meio.
  const info = [p.tipo, p.ano, ...(p.detalhes || [])].map(esc).join(' · ')
    .replace(/\b(ISBN|ISSN|p\.|v\.|n\.) /g, '$1&nbsp;');
  const pendente = p.pendente ? `\n            <!-- ${esc(p.pendente).replace(/^TODO/, '// TODO')} -->` : '';
  const acesso = p.url
    ? `<p class="pub__acesso">Acesso: <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.url)}${NOVA_ABA}</a></p>`
    : `<p class="pub__acesso pub__acesso--pendente">${esc(p.semLink || 'Acesso em breve')}</p>`;
  return `
        <li>
          <article class="pub dobra dobra--34" aria-labelledby="${id}">
            <h3 class="pub__titulo" id="${id}">${esc(p.titulo)}</h3>
            <p class="pub__descricao">${esc(p.descricao)}</p>
            <p class="pub__info">${info}</p>${pendente}
            ${acesso}
          </article>
        </li>`;
}

function substituir(html, nome, conteudo) {
  const re = new RegExp(`(<!-- ${nome}:inicio -->)[\\s\\S]*?(\\n\\s*<!-- ${nome}:fim -->)`);
  if (!re.test(html)) throw new Error(`Marcadores de "${nome}" não encontrados no index.html`);
  return html.replace(re, `$1${conteudo}$2`);
}

const capitulos = JSON.parse(ler('data/trajetoria.json'));
const publicacoes = JSON.parse(ler('data/publicacoes.json'));

let html = ler('index.html');
html = substituir(html, 'trajetoria', capitulos.map((c, i) => capitulo(c, i, capitulos.length)).join(''));
html = substituir(html, 'publicacoes', publicacoes.map(publicacao).join(''));
writeFileSync(join(raiz, 'index.html'), html);

console.log(`index.html atualizado: ${capitulos.length} capítulos, ${publicacoes.length} publicações.`);
