# eduaraujosa.com.br

Site pessoal de Eduardo Araújo: ensino de Ciências, pesquisa em educação e tecnologia.

Página única em HTML, CSS e JavaScript puros, sem framework e sem etapa de build. A única peça de servidor é `api/medium.php`, que transforma o feed do Medium em JSON.

## Estrutura

- `index.html`: todo o conteúdo do site (funciona sem JavaScript).
- `css/estilo.css`: tokens de design (cores em variáveis CSS) e estilos.
- `js/site.js`: menu, seção ativa, animação da Trajetória e seção Lifestyle. **As URLs e IDs das integrações ficam no objeto `LIFESTYLE`, no topo do arquivo**, junto de `CONSENTIMENTO_EMBEDS`.
- `api/medium.php`: feed do Medium → JSON, com cache de 1 hora em `api/cache/` (pasta protegida por `.htaccess`; precisa ter permissão de escrita no servidor).
- `img/`: fotos, logo (`logo-eduaraujosa-106/159`, em WebP e PNG) e ícones (`favicon-48/96/192/512.png`, `apple-touch-icon-v3.png`). O `favicon.ico` fica na raiz.
- `data/trajetoria.json` e `data/publicacoes.json`: dados dos capítulos e das publicações.
- `ferramentas/gerar-listas.mjs`: reescreve os blocos da Trajetória e das Publicações no `index.html` a partir dos JSON.

## Tarefas comuns

**Nova publicação ou foto na Trajetória.** Edite o JSON em `data/` e rode `node ferramentas/gerar-listas.mjs`. O script só troca o trecho entre os comentários `<!-- publicacoes:inicio -->`/`<!-- publicacoes:fim -->` (e os equivalentes da trajetória). Também dá para editar esse trecho à mão. Na Trajetória, o campo `foto` vazio deixa a zona de foto vazia; com um caminho (ex.: `img/trajetoria-2018.webp`) e `fotoAlt`, a foto aparece girada ao lado do capítulo.

**SoundCloud.** Em `js/site.js`, `LIFESTYLE.soundcloud.perfil` é a página da faixa (links "abrir" e "Ouvir no SoundCloud") e `playerSrc` é o `src` do iframe copiado do botão "Incorporar" do SoundCloud. Para trocar a faixa, troque os dois, os links da janela e a linha de créditos no `index.html`. Com `playerSrc` vazio, o player é montado pelo oEmbed a partir de `perfil`. Se um dia for o seu próprio perfil, inclua-o também no `sameAs` do JSON-LD.

**Post do Instagram.** Troque `LIFESTYLE.instagram.postShortcode` (o trecho depois de `instagram.com/p/`) e o link do estado sem JavaScript no `index.html`. O embed usa `/embed/` (cabe em 320×568); `legenda: true` usa `/embed/captioned/`, que é mais alto e fica recortado.

**Como o site sabe que um embed carregou.** Instagram e SoundCloud avisam a página por `postMessage` quando o conteúdo aparece. Sem esse aviso em 8 s, o iframe é removido e entra o estado de erro com o link direto (o evento `load` não serve, porque também dispara quando o navegador mostra uma página de erro).

**Consentimento (LGPD).** Com `CONSENTIMENTO_EMBEDS = false` (padrão), Instagram e SoundCloud aparecem como uma fachada e só carregam depois do clique do visitante. Com `true`, carregam sozinhos quando a janela se aproxima da tela. O Medium é servido pelo próprio domínio e não depende disso.

**Logo.** Para trocar, gere novamente `img/logo-eduaraujosa-106.*` e `-159.*` (53 px de altura em telas 2x e 3x) e os favicons. O logo aparece no cabeçalho e no rodapé do `index.html`.

**Resultado no Google.** O título vem de `<title>`, o texto de `<meta name="description">` e o nome do site do JSON-LD `WebSite` (`eduaraujosa.com.br`). O Google pode encurtar ou reescrever esses textos e leva alguns dias para atualizar depois da publicação.

## Versões

- v3 (out/2026): redesign a partir do Figma, com Trajetória em linha do tempo, Publicações em lista e seção Lifestyle (SoundCloud, Medium e Instagram).
- v2 (out/2026): redesign em coluna única, com narrativa sequencial.
