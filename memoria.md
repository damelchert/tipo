# Tipó — Memória do Projeto

## Info Geral
- **Nome:** Tipó (com acento) — português, curto, universal, personalidade brasileira
- **Repo:** github.com/damelchert/tipo
- **Deploy:** Vercel (auto-deploy on push)
- **Local:** `npx http-server -p 8080` em `/Users/danielmelchert/PROJETOS/tipo`
- **Domínios a verificar:** tipo.tools, tipo.app, tipo.art, tipotype.io
- **Total:** 28 ferramentas (6 visual tools + 22 kinetic type modes)

## Estrutura de Arquivos
```
/tipo/
  index.html                   — landing page (navegação progressiva com hash routing)
  
  # VISUAL TOOLS (6)
  dithering.html               — SVG dithering tool (FUNCIONAL — gold standard)
  reticula.html                — halftone grid, 11 shapes, video+webcam+MP4 (FUNCIONAL)
  glitch.html                  — RGB shift, pixel sort, slicing, video+webcam+MP4 (FUNCIONAL)
  ascii.html                   — 4 charsets, 3 color modes, video+webcam+MP4 (FUNCIONAL)
  overlay.html                 — gerador de texturas seamless, 12 patterns, image+video+webcam (FUNCIONAL)
  audiotype.html               — audio-reactive typography, text/image + audio/mic, 2-8 color levels (FUNCIONAL)
  
  # KINETIC TYPE — Fase 1: Core (22)
  cylinder.html                — kinetic type: cylinder (FUNCIONAL)
  field.html                   — kinetic type: field (FUNCIONAL)
  stripes.html                 — kinetic type: stripes (FUNCIONAL)
  coil.html                    — kinetic type: coil (FUNCIONAL)
  
  # KINETIC TYPE — Fase 2: 3D Intermediários
  flag.html                    — kinetic type: flag (FUNCIONAL — precisa refinamento)
  cascade.html                 — kinetic type: cascade (FUNCIONAL)
  ribbon.html                  — kinetic type: ribbon (FUNCIONAL)
  morisawa.html                — kinetic type: morisawa (FUNCIONAL)
  
  # KINETIC TYPE — Fase 3: 2D
  layers.html                  — kinetic type: layers (FUNCIONAL)
  danger.html                  — kinetic type: danger (FUNCIONAL)
  string.html                  — kinetic type: string (FUNCIONAL)
  
  # KINETIC TYPE — Fase 4: Composição
  badge.html                   — kinetic type: badge (FUNCIONAL)
  clutter.html                 — kinetic type: clutter (FUNCIONAL)
  construct.html               — kinetic type: construct (FUNCIONAL)
  
  # KINETIC TYPE — Fase 5: Animação
  snap.html                    — kinetic type: snap (FUNCIONAL)
  flash.html                   — kinetic type: flash (FUNCIONAL)
  pow.html                     — kinetic type: pow (FUNCIONAL)
  crash.html                   — kinetic type: crash (FUNCIONAL)
  crashclock.html              — kinetic type: crash clock (FUNCIONAL)
  vessel.html                  — kinetic type: vessel (FUNCIONAL)
  shine.html                   — kinetic type: shine (FUNCIONAL)
  boost.html                   — kinetic type: boost (FUNCIONAL)
  
  # REMOVIDOS
  duotone.html                 — REMOVIDO (muito raso)
  grain.html                   — REMOVIDO (muito raso)
  
  # SHARED
  shared/
    style.css                  — design system (#99E0D2 accent, dark/light theme, responsive)
    recorder.js                — TipoRecorder (MP4 via WebCodecs pra 2D E WEBGL; stream/WebM só como fallback)
    ui.js                      — TipoUI: sliders, presets, export, recorder init, formatters, theme toggle
  assets/
    fonts/IBMPlexMono-Regular.ttf
    favicon.svg                — SVG favicon (T em monospace)
    kinetic-preview.mp4        — vídeo do Cylinder para landing page
    preview-3d.mp4             — vídeo preview do quadrante 3D
  tipo_vault/
    knowledge/
      screeshots/              — 23 refs @antoncreations video 1
      screenshots 2/           — 9 refs video 2
      spacetype_src/           — 98 arquivos eng reversa (JS+HTML+CSS)
      spacetype_reverse_engineering.md
    outputs/                   — exports de teste
  projeto.md                   — visão do produto
  memoria.md                   — este arquivo (UNICO arquivo de memória)
  ATTACK_PLAN.md               — plano fase-a-fase
  README.md                    — README público
  .gitignore                   — exclui node_modules, vault, squads, package files
```

## Decisões Técnicas

| Decisão | Por quê |
|---------|---------|
| HTML puro sem build tools | Simplicidade, zero setup, deploy direto |
| Multi-page static site | Cada modo independente, performance, fácil manter |
| p5.js WEBGL pra kinetic type 3D | 3D nativo no browser |
| p5.js 2D pra stripes/coil | Sem overhead de WEBGL pra modos 2D |
| mp4-muxer UMD via CDN | Funciona sem npm/webpack, carrega sync |
| MP4 via VideoEncoder (2D) | Encoding direto, melhor qualidade |
| WebM via captureStream (WEBGL) | Única forma confiável de gravar canvas WEBGL |
| preserveDrawingBuffer nos WEBGL | Necessário pra savePNG funcionar em WEBGL |
| Real-time timestamps | Velocidade constante independente de performance |
| Bitmap trace pra text-to-shape | Fontes não carregam em SVG-as-Image |
| fill() em vez de stroke() no WEBGL | p5.js text() em WEBGL renderiza como geometria preenchida |
| .ttf em vez de .otf/.woff2 pra p5.js | loadFont() precisa de TTF ou OTF real (não WOFF) |
| Dark/Light theme via CSS variables | data-theme="light" no :root, persistido via localStorage |
| shared/ui.js com TipoUI | Eliminou ~1400 linhas de boilerplate duplicado |

## Padrões de UI (aplicar em todas as páginas)
- Section titles em **#99E0D2** (cor accent) — dark mode
- Section titles em **preto** — light mode
- Landing page labels: **#99E0D2** dark, **#000** light
- **Presets logo abaixo do campo Text** (primeiro contato do usuário)
- **Botão Reset** vermelho no final dos presets
- **Color pickers + Swap button** logo após presets
- **Swap button** (&#8646;) inverte type/bg colors com 1 clique
- **Header:** Nome do modo + nav links (KINETIC TYPE | HOME) — menu anterior à esquerda, HOME à direita
- **Visual Tools header:** VISUAL TOOLS | HOME
- Todos os presets usam **TIPÓ** como texto default (nunca sobrescrever com texto custom)
- MP4 recording + PNG export em todas as páginas
- Texto default: TIPÓ (sempre)
- **Theme toggle** (☼/☾) no canto superior direito de todas as páginas
- **Botão .btn** usa `color: var(--bg-0)` pra funcionar em ambos os temas

## Paleta de Cores

| Uso | Dark Mode | Light Mode |
|-----|-----------|------------|
| Background | #0a0a0a | #ffffff |
| Panel | #111111 | #f5f5f5 |
| Accent (section titles) | #99E0D2 | #99E0D2 |
| Landing labels | #99E0D2 | #000000 |
| Card titles | #99E0D2 | #000000 |
| Accent (links/UI) | #4488ff | #2266dd |
| Red (reset/rec) | #f44444 | #dd2222 |
| Text primary | #ffffff | #000000 |
| Text secondary | #aaaaaa | #555555 |

---

## 2026-06-10

### Sessão 1 — Stability Pass (commit 44c213f, pushed)
Auditoria com 3 agents paralelos + verificação manual de cada claim antes de agir.

**Bugs críticos corrigidos**
- `stripes.html` / `coil.html`: presets sobrescreviam o texto digitado (violava regra do projeto) — removido de 1 preset no stripes, 8 presets + resetAll no coil
- `shared/recorder.js`: race no Record — clicar Record durante o flush do stop anterior corrompia as duas gravações → flag `_stopping` bloqueia start durante flush
- `shared/recorder.js`: aba oculta capturava frames congelados → guard `document.hidden` no timer MP4 e no stream fallback (com `frameCount > 0` pra proteger captura do 1º frame)
- `shared/recorder.js`: timeout de revoke do download 5s → 60s (downloads grandes truncavam)

**Memory leaks corrigidos**
- Object URLs revogados em reticula/glitch/ascii/overlay/audiotype (padrão `setMediaUrl()`); overlay ganhou `releaseVideo()` que libera o decoder do vídeo antigo
- `audiotype.html`: `pagehide` fecha AudioContext, para mic, revoga URL de áudio
- `danger.html`: `buildTextures()` agora chama `.remove()` nos p5.Graphics antigos (morph de preset vazava ~18 buffers full-width por clique)
- `shared/ui.js`: TipoMouse ganhou `destroy()` + guard contra listeners duplicados no re-init

**Performance**
- `index.html`: cada navegação por hash empilhava 4 loops RAF + timelines GSAP (goKineticType → initQuadCanvases sem guard) → guard `_quadCanvasesInited`; loops pulam trabalho com `!cvs.offsetParent`

**Falsos alarmes dos agents (verificados e descartados)**
- badge.html "leak de buffers" — já faz cache + remove
- applyPreset "race condition" — comportamento correto (JS single-threaded)
- dithering.html "tema dessincronizado" — já usa a chave `tipo-theme`

### Sessão 2 — FASE 7.5 UI/UX Polish (5 de 6 itens — NÃO COMMITADO ainda)

**7.5.1 — Light mode default**
- `shared/style.css`: base do `:root` invertida pra light (sem flash dark no 1º acesso); vars de fonte/layout movidas pra bloco `:root` neutro
- Default `'dark'` → `'light'` em: shared/ui.js, index.html, overlay.html, dithering.html

**7.5.8 — Botão Voltar (28 páginas)**
- `TipoUI.initBackButton()` + mapa `_backTargets` (modo → hash da categoria); botão flutuante `←` top-left (CSS `.tipo-back-btn` no shared, espelho do theme toggle)
- Manual em overlay.html e dithering.html (não usam TipoUI)
- Mobile: `.tipo-back-btn { top: 60px }` pra não colidir com o hambúrguer `.tipo-panel-toggle`
- Back-links existentes nos painéis apontavam genericamente pra `#kinetic` → corrigidos pra categoria certa em 22 páginas

**7.5.4 — Hex input nos color pickers**
- `TipoUI.initHexInputs()`: campo texto hex após cada `input[type=color]`, sync bidirecional, aceita 3/6 dígitos com/sem `#`, dispara `input`/`change`
- `_syncHex()` chamado em setCol, swapColors e no morph de presets
- CSS `.tipo-hex-input` + `flex-wrap: wrap` nas rows de cor
- Standalone no overlay.html; dithering ficou fora (já tem hex display click-to-copy próprio)

**7.5.7 — Cards teal/âmbar**
- `.tipo-mode-card-preview`: fundo `#2b8a7c`, cor `#D4A040`, vars `--text-3..6` remapeadas pra tons âmbar (previews animados intactos)
- `.quad-preview`: fundo teal constante; `fg` dos quad canvases = âmbar fixo (MutationObserver de tema removido — não é mais necessário)

**7.5.3 — Paleta Athos nos defaults**
- 109 color inputs auditados; ~100 alterados em 26 tools. Família: ink `#1A1818`, cream `#F8F5F0`, teal `#2A8A7A`, mint `#99E0D2`, âmbar `#D4A040`, âmbar escuro `#B08830`, teal escuro `#1B5A4E`, âmbar claro `#E8C97E`
- 96 valores hardcoded dentro dos `resetAll()` atualizados via script Python (escopo limitado ao corpo da função — presets criativos intactos)
- Não alterados: overlay baseColor (#808080 funcional), dithering (sistema de paletas próprio)
- audiotype: ramp de 8 níveis dark→light na família Athos

**Infra**
- Cache-bust: `?v=20260610-fix1` (sessão 1) → `?v=20260610-ux1` (sessão 2), 27 páginas
- Sintaxe validada: `node --check` em shared/ui.js, shared/recorder.js e todos os scripts inline modificados

**PENDENTE da Fase 7.5**
- ~~7.5.2 — Header disruptivo~~ FEITO na Sessão 3 (ghost marquee + comet line)
- Smoke test visual em browser (light mode nas 28 ferramentas, hex inputs, cards teal/âmbar)
- 7.5.5/7.5.6 (gravação + auditoria de bugs) — gravação foi de fato corrigida só na Sessão 3 (ver abaixo)

### Sessão 3 — Light mode dithering, Header disruptivo, FASE 7.6 Export Pro (commits d60b2ab → 0dc4451, pushed)

**Dithering — light mode padronizado (d60b2ab)**
- Causa raiz: overrides antigos miravam classe `.panel` que NÃO EXISTE (painel real é `#controlPanel`) — light mode nunca estilizou o painel
- Reescrito bloco completo `html[data-theme="light"]` na paleta Athos (painel, labels, sliders, selects, chips, btns, dropzone, scrollbars, toggle/back buttons)
- Decisões deliberadas: swatches de state preview, modal de shapes e overlay de export ficam DARK nos dois temas (SVGs usam recortes pretos; cores claras precisam de fundo escuro)
- 100% CSS — zero mudança funcional (pedido explícito do Daniel: "não caga ela")

**7.5.2 — Header disruptivo (389acd1)**
- Ghost text virou MARQUEE gigante: "TIPÓ" 88px outline (`-webkit-text-stroke`), 12 palavras (2 metades de 6 pra loop seamless de `xPercent: -50`), cortado pelo header de 56px; a cada 3 palavras uma preenchida em âmbar (classe `.filled`)
- Hover no logo acelera o marquee 5x (`timeScale` no tween); magnetic hover dos ghosts removido (incompatível com marquee em movimento)
- `.header-line-comet`: cometa âmbar de 140px atravessa a linha gradient em loop (3.4s + delay); a cada navegação faz sprint rápido (1.1s power3.in) + flash de opacity na linha; versão light usa `#B08830→#1A1818`
- 10 entradas aleatórias mantidas; staggers dos ghosts reduzidos (~0.012-0.02) pros 48 chars
- Fase 7.6 adicionada ao ATTACK_PLAN no mesmo commit

**FASE 7.6.1 — Gravação (340a070 + 5db3587 + 0dc4451)**
Três bugs reais encontrados e corrigidos:
1. **WEBGL caía em WebM/MediaRecorder** (sem duração/cues → playback travado). Agora WebCodecs MP4 pra todos: p5 WEBGL tem `preserveDrawingBuffer: true` e `captureFrame()` roda dentro do draw() → drawImage do canvas WEBGL funciona. Stream/WebM virou só fallback (sempre via copy canvas)
2. **H.264 level fixo `avc1.42001f` (Baseline 3.1, máx ~720p)**: canvas maior (retina! dithering com vídeo!) → encoder errava ASSÍNCRONO e fechava → próximo `encode()` lançava exceção no RAF loop (preview congelado) → flush nunca resolvia (sem export). Fix: `_pickAvcCodec()` por resolução (3.1/4.0/5.1), cap de 4K aspect-preserving, `VideoEncoder.isConfigSupported` antes de gravar c/ fallback, `encode()` em try/catch (loop nunca morre), flush c/ timeout 15s no dithering
3. **Muxer do dithering sem `firstTimestampBehavior: 'offset'`**: TODOS os chunks rejeitados ("first chunk must have a timestamp of 0", 1º frame chega ~16ms) → MP4 de 581 bytes (só header). Era O bug do arquivo que o Daniel não conseguia abrir. Fix de 1 linha
- Outras melhorias: captura aspect-fit letterboxed em canvas fixo (pode mexer em QUALQUER parâmetro durante a gravação, até os que redimensionam o canvas), keyframes por TEMPO (1s) em vez de a cada 60 frames (seek confiável), throttle derivado do fps alvo

**FASE 7.6.2 — PNG (340a070)**
- `TipoUI.savePNG` reescrito em `canvas.toBlob` (sem depender do p5 saveCanvas)
- `TipoUI.savePNGAlpha`: PNG com fundo transparente — chroma-key da cor do `#bgColor` com un-mixing das bordas antialiased (diff 0-8 transparente, 8-48 ramp com un-mix, >48 opaco)
- Botão "PNG α" AUTO-INJETADO via `TipoUI.initAlphaButton()` nos 25 tools com `#bgColor` (glitch é image-based, fica fora)
- dithering: `exportPNGAlpha()` próprio com keying exato ±4 (pixels duros, sem antialias) + botão no painel

**Testes Playwright (NOVO — test-recording.mjs / test-recording-kinetic.mjs)**
- Playwright instalado como devDependency (browsers em ~/Library/Caches/ms-playwright)
- Sandbox bloqueia rede do browser → TODA rede interceptada via `ctx.route`: localhost → disco, CDN → fetch do Node com cache
- Precisa `http://localhost/...` (secure context pra getUserMedia); webcam fake via `--use-fake-device-for-media-stream`
- Pegadinha: `TipoUI` é `const` → NÃO existe em `window.TipoUI`; usar `typeof TipoUI !== 'undefined'` no waitForFunction
- Validado com ffmpeg: dithering 3.3s MP4 decode limpo; cylinder WEBGL 3.5s com slider+cor mudados NO MEIO da gravação; PNG/PNG-α RGBA válidos (fundo 99% transparente, tipo opaco)
- Rodar: `node test-recording.mjs` (dithering+webcam) / `node test-recording-kinetic.mjs <tool>.html`

**Infra**
- Cache-bust: `ux2` → `rec1` → `rec2`
- Commits: d60b2ab (dithering light), 389acd1 (header + plano 7.6), 340a070 (Export Pro), 5db3587 (H.264 level), 0dc4451 (muxer timestamp + testes)

**PENDENTE / próxima sessão**
- Daniel validar no Vercel: gravação no dithering e nos tools 3D (mexendo em parâmetros), PNG α, header novo, dithering em light mode
- ~~Rodar test-recording-kinetic.mjs nos outros 26 tools~~ FEITO na Sessão 4 (28/28 PASS)
- Smoke test visual light mode (28 ferramentas) continua pendente

### Sessão 4 — Validação 7.6 (28/28) + FASE 8 Dithering Engine Pro (commits c5850d7 → 6c4a0ec, pushed)

**Validação 7.6 — 28/28 PASS**
- Suite rodada em loop nos 27 tools restantes via test-recording-kinetic.mjs: TODOS gravaram MP4 (WebCodecs, ~106 frames/3.5s) com slider+cor mudados no meio, PNG e PNG α OK
- glitch: "PNG alpha: no button" — por design (image-based, sem #bgColor)
- overlay não usa TipoUI (recorder próprio lazy via TipoRecorder) → teste dedicado: MP4 1MB + composite PNG + tile PNG OK
- ffmpeg decode clean; warning inofensivo de dts duplicado (35>=35) num MP4 — rounding de timestamp, não afeta playback
- ATTACK_PLAN: 7.6 marcada ✅ completa
- Pegadinha node: scripts .mjs precisam rodar DENTRO do projeto (playwright resolve de node_modules local; /tmp não resolve)

**FASE 8.1/8.2/8.3/8.7 — Dithering Engine Pro (6c4a0ec)**
- /tmp/ditherboy-src PERDIDO (tmp limpo) — implementado 100% via papers públicos; se precisar das 82 paletas/efeitos do Dither Boy, re-extrair o app.asar
- **Arquitetura central**: `computeStateGrid(pixelData, cols, rows)` — quantização compartilhada entre `render()` e `exportSVG()`. Retorna `{lumArr (contínua, pós-gamma/invert — usada pro scale dos shapes), stateArr (0=highlight..6=shadow, ditherizada)}`. Dithering opera NA QUANTIZAÇÃO dos 7 estados → funciona com shapes, scale, rotation, paletas e SVG export sem mudar nada do resto
- **8.2 Error diffusion** (`DITHER_KERNELS`): Floyd-Steinberg, Atkinson, Stucki, Burkes, Sierra, Two-Row Sierra, Sierra Lite, JJN — serpentine scan (espelha kernel em linhas ímpares) + strength slider (multiplica o erro difundido)
- **8.3 Bayer 2/4/8/16**: matriz recursiva cacheada (`getBayer`), threshold `(M+0.5)/área - 0.5` com spread `strength/3` (≈ ±1 nível de quantização)
- **8.1 Pipeline**: Adjustments pré-dither via `hidCtx.filter` no downsample (brightness/contrast/saturate/hue-rotate/blur — GPU, de graça) + gamma (midtones) aplicada na luminância em JS; Tint/Color Overlay pós-render (`applyTint`: globalAlpha + globalCompositeOperation, 15 blend modes)
- **`effectiveBgColor()`**: compõe bg+tint num canvas 1×1 e lê o pixel → PNG α continua keyando certo com tint ligado
- Checkbox "enable mapping" OFF agora mostra o padrão de dither cru (quadrados cinza QUANTIZADOS em vez de contínuos)
- **8.7**: +16 paletas (40 total): Athos (brand!), Game Boy, CGA, C64, Apple II, Riso R/B, Riso Zine, Riso Poster, Sepia, Newsprint, Teal&Orange, Infrared, Pastel, Term Amber, Blueprint, Acid
- **test-dither-engine.mjs** (committado): 13 algoritmos → 13 hashes distintos, adjustments/tint mudam e resetam, PNG/SVG/PNG-α(tinted, 86% transparente) OK, gravação trocando algoritmo+paleta no meio → MP4 decode clean, 25 renders/s no pior caso (JJN @ gridRes 160)
- **UX nota (feedback do Daniel)**: diferença entre algoritmos é SUTIL na prática — dithering em 7 níveis só aparece em gradientes suaves; com "Scale Shapes with Midtones" ligado (default) o scale contínuo mascara o banding. Pra ver: gradiente suave + min=max no scale + None↔Floyd-Steinberg. Possível melhoria futura: quantizar o scale junto quando dithering ativo, ou um preview A/B

**Help tooltips no dithering (pedido do Daniel — "não sei o que é serpentine")**
- 11 ícones `?` (`.help-icon` + `data-help`) nos parâmetros: Dither Algorithm, Serpentine, Strength, Adjustments, Tint, Grid Resolution, Overall Scale, 7-State Mapping, Scale with Midtones, Invert, Rotation
- Tooltip único `#helpTooltip` position:fixed (não corta no painel com scroll), posicionado via getBoundingClientRect com clamp no viewport; hover mostra, clique pina (mobile), clique fora/scroll esconde; `preventDefault` no clique pra não togglar o checkbox pai
- Textos em PT-BR; dark + light mode
- Ideia futura: replicar o padrão nas outras ferramentas via TipoUI (ex: `TipoUI.initHelp(map)`)

**8.6 Risograph — riso.html (FEATURE EXCLUSIVA, novo tool #29)**
- Esqueleto baseado no overlay.html (standalone, sem TipoUI: theme/back/hex init manual, recorder lazy via TipoRecorder)
- **Pipeline `renderRiso(ctx,w,h,opts)`** parametrizada — live render, PNG 2x e separações usam a MESMA função (opts escala cell/misreg; `opts.soloLayer` isola camada com fundo transparente)
- **Separação tonal**: 1-3 camadas com gamma por slot `SLOT_GAMMA=[1.7,1.0,0.65]` (slot 1 pega sombras, slot 3 pega tudo) — simula como riso real separa tons em tintas
- **Halftone por camada**: grid rotado (ângulos default 15°/75°/45° como impressão real), dot gain no raio do dot
- **Grão de tinta**: canvas de noise 512px pré-gerado (fine noise + blotches senoidais) aplicado via `destination-out` — tinta "falha" organicamente
- **Misregistration**: offsets com seed (`seededRand(slot*7+n)`) + micro-rotação; botão re-roll + dblclick no canvas
- **Overprint**: composite `multiply` com `globalAlpha=inkOpacity` sobre cor de papel
- 18 tintas Riso reais, 6 presets (classic/zine/poster/editorial/punk/mono), demo source (gradiente + "RISO") pra nunca abrir vazio, image/video/webcam
- Exports: PNG composite 2x, separações transparentes por camada (staggered 400ms, `tipo-riso-ink{n}-{hex}.png`), MP4
- **test-riso.mjs** (committado): demo render, 5 presets → 5 hashes, toggle de camada, PNG 7MB, 3 separações, MP4 decode clean, reroll, help icons — 8/8 PASS
- Card "Ri" adicionado no index (Visual Tools, depois do Overlay)
- Pós-feedback do Daniel: botão renomeado "Re-roll Registration" → "Re-roll Offset" + help icon `?` próprio explicando (sorteia a DIREÇÃO do desalinhamento; intensidade vem do slider Misregist.; atalho dblclick no canvas). 4 help icons no riso agora

**Restante da FASE 8** (blocos grandes): 8.4 CMYK halftone, 8.5 Epsilon Glow, 8.8 glitch avançado, 8.10-8.12 tools novas (obs: audiotype.html JÁ EXISTE — plano 8.9 desatualizado)

### Sessão 5 (2026-06-11) — 8.4 CMYK Halftone integrado no riso.html

**Decisão do Daniel**: comecei halftone.html standalone (clone do riso) mas ele preferiu INTEGRAR no riso — e faz sentido: gráficas riso fazem impressão 4 cores de verdade. halftone.html deletado.

**Modo CMYK no riso.html**
- Toggle **Spot Inks | CMYK** (seção Mode, `setMode`/`syncModeUI`); `activeLayers()` retorna `layers` (3 spot) ou `cmykChannels` (4 fixos C/M/Y/K)
- **Separação RGB→CMYK com GCR**: `c=1-r, k=min(c,m,y)*gcr, c'=(c-k)/(1-k)` — slider GCR (0=só CMY, 100=todo cinza vira K), aparece só no modo CMYK (`#gcrRow`)
- Ângulos clássicos de offset: C 15° / M 75° / Y 0° / K 45°; cores de canal editáveis (picker); slider "Ink" por canal (mesmo coverage/50 do spot)
- Grain, misreg, dot gain, overprint multiply: valem nos DOIS modos (é riso imprimindo CMYK, não offset limpa)
- `renderRiso` agora branch: `cmykArr[4]` Float32Arrays ou `lum`; densidade do dot: `cmykArr[slot][i]*covMul` vs `pow(1-lum[i], gamma)*covMul`; `layerCanvases` virou 4 slots
- Demo colorido no modo CMYK (gradiente rainbow + "RISO") pra separação ser visível
- 3 presets novos com `mode:'cmyk'`: CMYK, Newsprint (cell 13, gain 50, gcr 90, papel jornal), Comic (cell 16, vivid); applyPreset troca de modo automaticamente
- exportLayers no CMYK: 4 plates transparentes `tipo-riso-cmyk-{c,m,y,k}.png`
- buildLayerUI dinâmico: título "Ink Layers" ↔ "CMYK Channels", sem select de tinta no CMYK, label Coverage↔Ink
- test-riso.mjs estendido: cmyk mode, gcr muda render, 4 separações, newsprint distinto, volta pro spot (3 blocks) — 13/13 PASS
- Card do index atualizado (CMYK process, 9 presets, plates)

**8.8 Glitch avançado (glitch.html turbinado)**
- 5 efeitos novos do Dither Boy: **Block Shift** (blocos deslocados via copy()), **Block Scramble** (blocos trocam de lugar, get+copy+image), **Channel Swap** (permuta R/G/B por bloco, 3 modos), **Scanline Offset** (linhas aleatórias deslocam com wrap), **Interlace** (linhas pares/ímpares em direções opostas, wobble com speed)
- Seção "Blocks" nova (Block Size 4-64 + 3 sliders); Scanline Offset + Interlace na seção Effects
- **Refactor perf**: pixel sort, noise e os novos efeitos pixel-level agora rodam num ÚNICO loadPixels/updatePixels (antes eram 2 separados); `shiftRowWrap` usa rowScratch reutilizável (sem GC churn); 30fps no preset chaos com tudo ligado
- Presets atualizados: vhs (+scanOffset/interlace), corrupt (+blocks), datamosh (+scramble/channelSwap, blockSize 24), crt (+interlace), static (+scanOffset), chaos (tudo)
- Help tooltips (2 ícones: Blocks, Effects) — padrão riso replicado
- **Pegadinha de teste**: channelSwap parecia não funcionar — a imagem demo é CINZA (r=g=b), trocar canais não muda nada. Teste usa source colorido injetado via createGraphics
- test-glitch-adv.mjs (committado): 5 efeitos novos + 3 regressões mudam render, presets distintos, PNG, MP4 com preset trocado no meio decode clean, fps check — ALL PASS
- Chromatic Aberration do plano: já coberta pelo Channel Shift existente (tint ADD R/G/B deslocados)

**8.13 DATAMOSH planejado (pedido do Daniel — ferramenta nova, pegada After/Cavalry)**
- Spec completa escrita no ATTACK_PLAN 8.13: simulação de codec (block matching → motion vectors → canvas acumulado), 4 modos (Smear/Melt/Hybrid/Cross-Mosh com 2 sources), ~12 parâmetros (block size, search radius, mosh amount, melt iterations, vector multiplier/jitter/bias, decay, threshold, channel mosh), keyframe drop manual/auto/sweep recovery + clique no canvas como trigger VJ, 8 presets
- Diferencial: datamosh paramétrico em tempo real no browser (concorrência = Avidemux/plugin pago de AE, offline e destrutivo)
- Obs: Daniel referenciou .agents/skills/data-squad e devops-squad — são squads de negócio/infra (skip design visual), não se aplicam ao design da ferramenta; design feito direto da referência técnica de codec

**8.13 DATAMOSH construído (datamosh.html — ferramenta nova, exclusiva)**
- Standalone (sem p5/TipoUI, padrão riso): mainCanvas 2D + acumulador ping-pong (accA/accB) + frameCanvas (frame real) + estCanvas (192px grayscale pra motion estimation)
- **Block matching**: SAD por bloco em grayscale downscaled, busca espiral cacheada (`spiralOffsets`) com early-exit; vectors em px do working size; threshold descarta blocos parados
- **Mosh**: em vez de pintar o frame novo, vectors PUXAM conteúdo do acumulador (`src = pos - v`); melt = re-aplica N vezes/frame; recover = frame real vaza com globalAlpha; amount = % dos blocos
- **Keyframes**: botão Drop, auto a cada N seg, sweep recovery (frame real entra linha a linha), clique no canvas = drop (VJ)
- **Cross-Mosh**: Video B como motion source (`motionVideo` dirige updateGray, source A derrete com o movimento de B)
- **Channel mosh display-only**: acc mantém o mosh completo; display = frame real + 1 canal do acc (rasgo cromático sem matar a evolução temporal)
- Bias (angle+force) + jitter; ainda funcionam com imagem parada (drift no caminho vectors-vazios)
- Demo animado (3 blobs + "MOSH" quicando) pra self-mosh sempre ter movimento
- 7 presets (classic/melt/bloom/ghost/tear/drift/collapse), 5 help tooltips, PNG + MP4 (TipoRecorder), loop sempre rodando ~30fps
- test-datamosh.mjs: 12/12 PASS primeira rodada — temporal, amount=0 congela acc, divergência do frame real (diff 52.8), keyframe reseta (→10.0), sweep completa, channel R difere, bias em still, presets distintos, PNG, MP4 válido (ffmpeg), 28.5fps no collapse
- Card no index (preview "Dm", depois do Glitch); ATTACK_PLAN 8.13 ✅

**8.5 Epsilon Glow construído (seção nova no dithering.html, pós-tint)**
- Ordem do pipeline Dither Boy: dither → tint → epsilon glow; chamado em render() depois de applyTint
- Pipeline: soft threshold (smoothstep thr±smoothing na luminância) → bright pass → 3 oitavas de blur gaussian (raios `baseR*(1+distScale)^k`, pesos `falloff^k` normalizados = distance map aproximado) → normalização epsilon `g/(g+ε)*(1+ε)` (joelho do bloom: ε baixo = brilhos fracos estouram) → screen composite
- **Anamórfico com direção**: squeeze do eixo forte antes do blur isotrópico (blur efetivo = r×aspect), rotação ±dir em canvas quadrado D=hypot pra streak em qualquer ângulo (lens streak J.J. Abrams)
- Perf: glow computado a ≤420px (low-frequency) e upscaled com smoothing — ~23 renders/sec no pior caso (anamórfico+rotação); canvases de trabalho module-level reutilizados (_glowSrc/_glowRot/_glowSq/_glowAcc)
- 9 controles (Intensity 0-200 / Threshold / Smoothing / Radius / Epsilon / Falloff / Dist Scale / Aspect 0.1-4 / Direction 0-180°), Intensity 0 = off; help icon na seção
- test-glow.mjs: 12/12 PASS primeira rodada — glow só ADICIONA luz (screen, mean 77.9→92.6), threshold=100 mata glow, joelho epsilon (ε=0.02 mean 146.5 > ε=1.0 87.5), direção anamórfica muda render, radius/falloff/dist mudam, interop com tint, PNG, MP4 com webcam válido, perf
- Card do dithering no index atualizado (13 algoritmos, tint, anamorphic epsilon glow)

**8.12 Pixel Sort construído (pixelsort.html — standalone, padrão riso/datamosh)**
- Asendorf clássico: máscara de threshold (brightness entre low/high, invert opcional) define intervalos por linha; cada intervalo ordenado por key (brightness/hue/sat/R/G/B), asc/desc
- **Angle 0-360°**: fast paths horizontal/vertical (0/90/180/270, com desc flip pra 180/270); ângulos arbitrários via rotate → sort horizontal → rotate back em canvas D=hypot; pixels alpha<8 (padding da rotação) nunca entram em intervalos
- sortRun com buffers reutilizáveis (keyBuf Float32 / idxBuf Uint32 / pxBuf): sort de índices por key, escrita permutada — sem alocação por frame
- Structure: Max Span (limite de comprimento do intervalo), Randomness (`(r/100)²*0.35` chance de quebra por pixel), Mix (blend com original)
- **Drift**: janela de threshold varre com seno (driftT) — anima imagem estática pra gravação; loop só re-renderiza quando dinâmico (video/webcam/drift/rec) senão requestRender
- 7 presets (classic/veils/shatter/spectrum/scanwave/subtle/chaos), 4 help icons, demo "SORT" colorido (pôr-do-sol + montanhas)
- test-pixelsort.mjs: 14/14 PASS primeira rodada — inclui teste de MONOTONICIDADE (linha inteira sorteada deve ser não-decrescente em luminância), 6 keys distintas, 3 ângulos distintos, drift anima, MP4 válido, 30fps no pior caso (45° full mask)
- Card "Ps" no index antes do Overlay; nota: o slider pixelSort do glitch.html continua lá (efeito rápido), pixelsort.html é a versão pro

**Varredura de fluidez de recording (pedido do Daniel: "a grande maioria ainda trava o play na hora do recording")**
- Criado `test-rec-sweep.mjs`: mede fps do draw-loop antes/durante recording em TODAS as ferramentas + analisa o MP4 exportado via ffmpeg showinfo (deltas entre frames; stutter = >80ms, dupe = ≤1ms). Rodar com `DPR=2 node test-rec-sweep.mjs` (emula retina, que era o que reproduzia o problema); `ONLY=field,riso` filtra ferramentas
- **Causa raiz global**: recorder aceitava encode até 4K — canvas retina (DPR=2) virava encode H.264 de ~3000px em software, roubando o main thread. Fix em `shared/recorder.js`: cap de encode em classe 1080p (`min(1, 1920/long, 1080/short)`) nos paths MP4 e stream
- **riso.html**: loop de gravação re-rodava o renderRiso completo (~60ms) por frame mesmo com fonte estática → MP4 a 16fps. Fix: loop só re-renderiza se fonte dinâmica (video/webcam) ou `loopDirty` (param mudou); recorder duplica frames estáticos a 30fps. Deltas: 62.5ms → 28ms
- **field.html**: fill-rate bound em retina (16fps idle @ density 2; 30fps @ density 1; geometria ok). Fixes: `pixelDensity(min(displayDensity(), 1.5))` permanente (26fps idle) + `recorder.onStatusChange` derruba pra density 1 durante gravação (MP4 encoda ≤1080p, retina não agrega nada) → gravação a 30fps cravados
- Sweep final DPR=2: todas as 16 ferramentas com 0 stutters, 0 dupes, avg ~33ms (riso 28ms, dithering 17ms). reticula/ascii/riso mostram 0 fps idle por design (render on-demand)
- test-riso, test-recording, test-recording-kinetic re-rodados: tudo PASS

**Fase 9 — Cavalry Mode planejada (aprovado pelo Daniel)**
- Daniel perguntou se dava pra ter "todas as funcionalidades do Cavalry"; resposta: clone completo inviável, mas os 4 conceitos centrais cabem. Fase 9 criada no ATTACK_PLAN: 9.1 Behaviors (oscilar qualquer slider — PRIMEIRO), 9.2 Stagger por índice, 9.3 Duplicator, 9.4 Mini-timeline com keyframes (GSAP). Features transversais antigas viraram Fase 12.

**8.10 Depth construído (depth.html — standalone, three.js)**
- three.js r146 UMD + ShaderMaterial: vertex shader desloca PlaneGeometry (16-400 segs, rebuild on change) pelo canal R do depth map; fragment com shading fake (normais por derivada do depth, slider Shading 0-100)
- **3 fontes de depth**: Luminance (default, instantânea, atualiza por frame com video/webcam), AI Depth Anything V2 small (transformers.js via import dinâmico do CDN, dtype q8, ~40MB lazy com progress; snapshot 768px do frame atual; RawImage → canvas grayscale) e upload manual
- Depth pós-processado num canvas ≤320px com ctx.filter (grayscale + contrast + blur + invert), preview ao vivo no painel; depthDirty flag evita rebuild desnecessário
- Mouse parallax suavizado (lerp 0.07) + órbita senoidal (Rotate/Speed — anima MP4 sozinho), zoom por camera.z, wireframe toggle (lindo com tipografia)
- Texturas: VideoTexture pra video/webcam, CanvasTexture capada em 2048px pra imagens; renderer 1080p classe, pixelRatio 1, preserveDrawingBuffer pro recorder
- 6 presets (relief/pop/wire/orbit/canyon/hologram), demo "TIPÓ" com anéis concêntricos (relevo bonito), 4 help icons
- Export: PNG, Depth PNG (1024px reescalado), MP4 (TipoRecorder)
- test-depth.mjs: 15/15 PASS — inclui depth map manual virando rampa no depthCanvas, parallax mexendo mesh.rotation, webcam com VideoTexture, presets 6/6 distintos. Pegadinha: checkbox dispara 'input' (não só 'change') — listener do invertDepth ouve os dois
- Card "3d" no index antes do Overlay. AI depth não testado em headless (download 40MB) — testar manual no deploy

**8.11 Gradient Map construído (gradientmap.html — standalone, 2D canvas) — FECHA A FASE 8**
- Photoshop gradient map ao vivo: luminância → rampa de cor, com video/webcam e cycle animado
- Editor de gradiente custom (sem lib): 2-10 stops absolutamente posicionados sobre canvas da rampa; click na barra adiciona stop sampleando a cor atual da LUT naquela posição, pointer drag move (setPointerCapture no container), dblclick remove (guard mín. 2), Distribute equaliza, color picker edita o selecionado, reverse
- Pipeline: LUT Uint8ClampedArray 256×3 (stops sorted + lerp) + tone curve Uint8Array 256 (brightness shift, contraste S `0.5+tanh((t-.5)k)/(2tanh(.5k))` k=1+c*6, posterize quantize, cycle = wrap shift `(t+cycleT%1)%1`); por pixel: `tone[(r*77+g*150+b*29)>>8]` → LUT, com mix blend
- Loop contínuo só quando dinâmico (video/webcam/cycle>0/recording); imagem parada = render on-demand via needsRender — segue o padrão da varredura de recording
- 8 presets: Athos (brand 4 stops), Duotone, Sunset, Infrared, Chrome, Neon, Sepia, Acid (posterize 6 + cycle 24)
- test-gradientmap.mjs: 14/14 PASS — LUT endpoints exatos por valor, reverse flip, stops add/move/remove/min-2, added stop sampleia a rampa, tone controls, cycle anima no tempo, webcam, PNG, MP4 limpo (h264 900×620 30fps), ~637 renders/s no demo. reverseGrad ouve 'input'+'change' (mesma pegadinha do depth)
- Card "Gm" no index antes do Overlay. Fase 8 inteira marcada ✅ no ATTACK_PLAN

**9.1 Behaviors construído (TipoBehavior em shared/ui.js — Cavalry Mode começou)**
- Qualquer slider de qualquer ferramenta ganha botão "~": clique inicia oscilação + abre popover (Type/Amount/Speed + off). 5 tipos: sine, noise (3 senos somados), loop (sawtooth), ping-pong (triângulo), random step
- rAF central único a ~30fps: clamp em [min,max], snap no step, dispara `input` com bubbles só quando o valor muda — ferramentas render-on-demand re-renderizam, labels seguem
- Auto-init: DOMContentLoaded + MutationObserver debounced 200ms (pega sliders dinâmicos — layers do riso, painel inteiro do dithering que monta via JS). Sliders sem id ganham `tipoBhvAutoN`; behavior se auto-desliga se o elemento sai do DOM (innerHTML rebuild)
- Drag manual re-centraliza (checa `e.isTrusted` — eventos sintéticos do próprio behavior não). Preset morph do TipoUI seta `TipoBehavior.paused` e chama `resync()` no fim
- CSS injetado pelo próprio ui.js com fallbacks `var(--accent, #2A8A7A)` — funciona até no dithering.html que não carrega shared/style.css (lá adicionei só as vars :root pro light mode)
- ui.js agora incluído nas 7 ferramentas standalone (datamosh/depth/dithering/gradientmap/overlay/pixelsort/riso) — sem conflito, TipoUI.init não é chamado nelas. Cache bust geral: ?v=20260612-bhv (ui+style), recorder unificado em ?v=20260612-cap
- test-behaviors.mjs 14/14 PASS (gradientmap standalone + cylinder TipoUI: injeção, popover, 5 tipos movem, clamp, off restaura center, múltiplos simultâneos, morph pause/resync) + smoke nas 33 páginas (botões = sliders, zero pageerror). test-gradientmap e test-riso re-rodados OK
- Opt-out por slider: atributo `data-nobhv`

**9.2 Stagger construído (TipoStagger em shared/ui.js)**
- `TipoStagger.t(mode, col, row, cols, rows)` → 0..1 normalizado: index (posição linear no grid), row, col, center (distância do centro / máximo), random (hash senoidal determinístico — mesmo seed por célula, não pisca)
- `TipoStagger.phase(...)` = eased(t) × (amount/100) × 2π em radianos; curvas linear/inOut/in/out via TipoEase.cubic. amount 0–200 (200 = 2 ciclos de defasagem)
- Integração = somar a fase no offset do wave engine de cada tool: **field** (7 call sites: zW/xW/yW/zRot/xStW/strX/strY), **stripes** (sinEng ganhou 7º param `ph`; stgAt(i,k) com constrain nos 5 call sites; labels Row→"Ribbon", Col→"Character"), **cascade** (sinEng + ph; grids normal e mirror — mirror usa `ri` invertido pra simetria bater)
- UI padrão (3 tools): seção Stagger — Mode select (Off/Index/Row/Col/Center/Random) + Amount range + Curve select; selects com `style="flex:1"` dentro de `.range-row`; resetAll restaura off/100/linear
- Cascade: stagger só age com waveSpeed > 0 (wSpd=0 pula o engine inteiro — comportamento original mantido)
- Cache bust ui.js: ?v=20260612-stg nas 33 páginas (TipoStagger entrou depois do bump -bhv)
- test-stagger.mjs 20/20 PASS: unit math (ends 0/1, center, random range/distinct, off/amount-0, escala, curva) + render determinístico (noLoop + frameCount fixo + redraw + loadPixels hash — funciona em 2D e WEBGL) nos 3 tools: 5 modos ≠ off e distintos entre si, amount 0 == off, curva muda render, resetAll. Smoke 34 páginas zero pageerror
- Truque de teste novo: `frameCount = 99; redraw()` → draw vê 100 sempre (redraw incrementa antes) = frames comparáveis byte a byte

**Paleta brand como default de entrada (pedido do Daniel, screenshot do Coil)**
- Daniel: "ao entrar em cada ferramenta, especialmente as de kinetic type, o padrão é esse do coil (e da tipó)" — o default de entrada deve seguir a identidade do site; usuário muda depois
- Paleta canônica (ordem do Coil): c1 #2A8A7A (teal) → c2 #D4A040 (gold) → c3 #1A1818 (preto) → c4 #99E0D2 (mint), c5 #1A1818, bg #F8F5F0, **numColors 4**
- Audit mostrou que os inputs já eram brand em quase tudo; o problema era numColors baixo e ordem trocada. Corrigidos: **cascade** (era cream/preto n=2), **flag** (mint/preto n=2), **stripes** (n=3→4), **ribbon** e **string** (ordem antiga com #B08830, n=5→4)
- resetAll sincronizado com os novos defaults nos 5 (verificado via Playwright); presets não mexidos
- Já estavam brand e ficaram como estão: coil (referência), clutter, construct, layers, reticula, crashclock, audiotype (rampa de 8 níveis), e todas as single-color (preto no cream = brand)

**Deferred (sessões futuras, aprovado pelo Daniel)**
- **Upgrade do Overlay Generator** — Daniel (2026-06-12): "tá meio meme (tosca) ainda, precisava dar um upgrade nela; depois vamos voltar nela". Repensar patterns/controles/presets.
- Refactor shared/ (~400 linhas duplicadas): shared/media.js pros visual tools, boilerplate p5 dos 22 modos, util de luminância
- Performance restante: glyphWidth caching em WEBGL, cache de objetos de cor, debounce de resize, frameRate(30) em 11 arquivos pesados

---

## 2026-05-26

### Fase 7 — Cavalry-Level Polish (COMPLETA)
Implementadas 4 melhorias em shared/ui.js + 8 páginas modificadas:

**7.1 — TipoEase Library**
- 10 curvas profissionais: sine, quad, cubic, quart, quint, expo, circ, back, bounce, elastic
- 3 direções: in, out, inOut
- Slider "Easing" adicionado em: Snap, Flash, Pow, Boost, Vessel
- Vessel migrado de 7 funções locais → TipoEase compartilhado

**7.2 — TipoMouse System**
- Mouse/touch interaction opt-in com smoothing
- Field: letters repel from cursor
- Danger: distortion center follows mouse
- Pow: explosion center follows mouse

**7.3 — TipoNoise System**
- 3-harmonic sine jitter para movimento orgânico
- Slider "Organic" em: Snap, Boost, Flash

**7.4 — Smooth Preset Transitions**
- Morph de 300ms com TipoEase.inOut.cubic
- Interpolação de sliders + cores (hex lerp)
- Funciona automaticamente em TODAS as 28 ferramentas

### Engenharia Reversa — Dither Boy 6.0.3 (Studio AAA)
- **Tech:** Electron app, React 18, Zustand, Bytenode (V8 bytecode), FFmpeg WASM
- **Extraído (código legível no imageProcessor.worker.js):**
  - Pipeline de 9 efeitos: adjustments → dither → halftone → post → tint → epsilon glow → jpeg glitch → chromatic → temporal
  - Halftone CMYK completo com supersampling, dot gain, GCR
  - Epsilon Glow (luminance mask → distance map → gaussian blur → weighted composite)
  - 16 blend modes para tint/overlay
  - JPEG Glitch (5 sub-efeitos)
  - Chromatic Aberration (per-channel displacement)
  - Temporal Variation (9 animated noise patterns)
  - 82 paletas de cores (RGB values)
  - Metadados completos dos 73 algoritmos (controls, ranges, defaults)
- **Protegido (V8 bytecode .jsc):** 73 algoritmos de dithering — mas todos são algoritmos públicos com papers
- **Conclusão:** Implementar via papers originais, usando metadados como spec sheet
- ATTACK_PLAN expandido: Fase 8 agora tem 12 sub-itens incluindo Risograph e AudioType

### AudioType — Nova Visual Tool (EXCLUSIVA)
- **audiotype.html** — tipografia reativa a áudio
- Texto/imagem → grid de barras coloridas → barras pulsam com música
- Web Audio API: AnalyserNode + FFT para frequencyData em tempo real
- Inputs: texto digitado, upload de imagem, upload de áudio (MP3/WAV), microfone
- 3 modos: horizontal bars, vertical bars, pixel grid
- 2-8 níveis de cor customizáveis por faixa de luminosidade
- 8 presets: Equalizer, Waveform, Spectrum, Pulse, Minimal, Neon, Mono, Fire
- Idle animation quando sem áudio (subtle sine wave pulse)
- Drag & drop para áudio e imagem
- Export: PNG + MP4 via TipoRecorder
- Adicionado à landing page (index.html) como 6ª Visual Tool

---

## 2026-05-31

### Correções 2D + Recorder — Histórico Consolidado

**Contexto do problema**
- O usuário reportou que a seção 2D (`Layers`, `Danger`, `String`) estava bugada e depois mostrou screenshot do `Layers` em que clicar em **Record MP4** parava a animação e terminava com **Export failed**.
- Testes headless iniciais passaram, mas o browser real revelou a falha: o caminho `MediaRecorder/captureStream` era frágil para as ferramentas 2D e podia gerar chunks vazios, travar perceptualmente a animação ou continuar usando script antigo via cache.

**Commits relevantes**
- `3081da9 Fix 2D kinetic modes`
  - `layers.html`, `danger.html`, `string.html` foram estabilizados na aba 2D.
  - Removido uso indevido de WEBGL/textures nos modos 2D.
  - `Layers`: refeito como strips 2D responsivos.
  - `Danger`: refeito com buffer 2D + distorção por grid/células.
  - `String`: refeito com ribbons/curvas 2D sem debug dots.
- `294810f Fix recording and 2D controls`
  - `Layers`: adicionado controle **Speed** (`motionSpeed`, 0.00-2.00); speed 0 congela o movimento sem quebrar o draw loop.
  - `Danger`: removido o TIPÓ estático/ghost no fundo; adicionado upload de imagem/vídeo de background + `Clear Media`; tipografia distorcida grava por cima da mídia.
  - `String`: preset `VOTE` passa a usar cores da bandeira do Brasil (`#009c3b`, `#ffdf00`, `#ffffff`, `#002776`); adicionados patterns `Wave`, `River`, `Rain`, `Orbit`, `Spiral`, `Harp`, `Constellation`; presets agora usam caminhos diferentes.
  - `shared/ui.js`: start/stop do recorder protegido com try/catch/finally para botão e overlay voltarem ao estado correto mesmo em falha.
  - `shared/style.css` / `index.html`: aplicação da paleta Athos/mint/warm accent no sistema visual.
- `3cb090a Fix 2D recording cache path`
  - Correção final do recorder: 2D voltou a usar MP4 direto via WebCodecs + mp4-muxer por padrão.
  - `MediaRecorder/captureStream` ficou como fallback para WEBGL ou browser sem WebCodecs.
  - Corrigido timestamp inicial do MP4: `firstTimestampBehavior: 'offset'` no muxer + normalização manual do primeiro timestamp para 0.
  - Adicionado timer interno de captura MP4 (`_mp4FrameTimer`) para gravar também canvases pouco animados/estáticos, como `ASCII` e `Retícula`.
  - Adicionado cache-bust `?v=20260531-rec2` nos imports `shared/recorder.js`, `shared/ui.js` e `shared/style.css` das 28 páginas de ferramentas para impedir browser de manter recorder antigo.

**Validação executada**
- `git diff --check`: OK antes dos commits.
- Testes CDP/Chrome headless com clique real em `toggleRec()`:
  - `Layers`: animação avançou durante REC, usou WebCodecs (`hasEncoder: true`) e exportou MP4 (~1.3 MB).
  - `Danger`: animação avançou durante REC e exportou MP4 (~0.3 MB).
  - `String`: animação avançou durante REC e exportou MP4 (~0.2 MB).
  - `ASCII` e `Retícula`: depois do timer interno MP4, passaram a gravar frames mesmo com `pageFrame` quase estático.
- Smoke test amplo anterior: 27/27 tools completaram fluxo REC/STOP/download quando ambiente headless tinha contexto compatível.

**Lições / decisões para próximos agentes**
- Não confiar só em smoke test headless para gravação/exportação; validar em browser real quando o usuário reportar falha visual.
- Para 2D, preferir WebCodecs/mp4-muxer. `captureStream` é útil como fallback, mas foi fonte da falha vista pelo usuário.
- Sempre versionar/cache-bust arquivos compartilhados quando corrigir bug crítico em `shared/recorder.js` ou `shared/ui.js`; o Vercel/browser pode manter script antigo.
- Ao testar export, evitar salvar downloads dentro de `assets/`; um teste sobrescreveu temporariamente `assets/tipo-export.mp4` e precisou ser restaurado.

### Estado Pós-Correção
- Repo estava limpo após os commits e push.
- Histórico recente inclui também commits posteriores de landing/header/quadrants:
  - `496252b Header: GSAP animations, ghost text, 10 random entrances, video blend fix`
  - `6882330 Quadrant previews: replace CSS animations with canvas GSAP renders`
  - `eecc124 Animation quadrant: rewrite with GSAP timelines — 6 crafted modes`
- Servidor local usado nos testes: `http://127.0.0.1:4173/index.html#2d`.

---

## 2026-05-30

### Brand Identity — Paleta "Athos" (Mint Brasileiro)
- **Pesquisa completa** em `tipo_vault/brand/`:
  - `01-competitive-color-research.md` — 10 concorrentes analisados (SpaceType, Cavalry, Rive, Figma, Canva, etc.)
  - `02-brazilian-color-identity.md` — estudo cultural: Tarsila, Oiticica, Athos Bulcão, Lina Bo Bardi, Cerrado, Bossa Nova
  - `03-palette-proposals.md` — 8 paletas completas (Terracota Digital, Mata Noturna, Tropicália, Concreto & Ipê, Azulejo, Cerrado, Bossa Nova, Neon Favela)
  - `00-RECOMENDACAO-FINAL.md` — consolidação + híbrido recomendado
- **Descoberta-chave:** mint #99E0D2 é território vazio — NENHUM concorrente usa. Diferencial real.
- **Paleta aplicada (CSS variables em shared/style.css):**
  - Dark: warm blacks `#0C0C0A`, ivory text `#E8E4E0`, teal accent `#2A8A7A`
  - Light: warm off-white `#F8F5F0`, deep teal `#1B7A6A`
  - Novas vars: `--accent-brand` (mint), `--accent-warm` (gold #D4A040)
  - Section titles via `var(--accent-brand)` em vez de hardcoded
- **Princípio:** "brasileiro na temperatura, não nos símbolos" — warmth sutil que se sente mas não se aponta
- **Presets criativos das tools NÃO mudaram** — user continua livre pra brincar com cores

### Bug fixes — Tools 2D
- Danger: fix anchorY (`/ 0.5` → `/ 2`), pride mode funcional, background media support
- Layers: rewrite para 2D (era WEBGL), speed control, ResizeObserver, fitCanvas robusto
- String: path patterns (wave, river, rain, orbit, spiral, harp, constellation), speed determinístico

### AudioType — Deploy
- `audiotype.html` commitado e deployed no Vercel (estava untracked)
- Card na landing page já existia, agora funcional

### Header — GSAP implementado
- GSAP 3.12.5 adicionado à landing page
- Logo "TIPÓ" com letras individuais: magnetic hover, text scramble, elastic spring
- Ghost text (120px) preenchendo o fundo do header — reage ao mouse
- 10 animações de entrada alternando randomicamente a cada navegação (drop, elastic, 3D flip, scatter, glitch, wave, typewriter, etc.)
- Linha animada mint→ouro fluindo no bottom do header
- Partículas flutuantes mint + ouro
- "Visual Tools" e "Kinetic Type" com split chars + scramble + magnetic hover
- Vídeo 3D: mix-blend-mode lighten pra fundir preto puro com warm black

### Quadrant previews — Canvas GSAP
- Substituídas as animações CSS amadoras por canvas renders:
  - **3D:** cilindro rotativo de caracteres com depth/perspectiva
  - **2D:** grid de texto com noise distortion (skew, scale, linhas)
  - **Composition:** texto orbitando em anéis concêntricos (badge circular)
  - **Animation:** 6 GSAP timelines ciclando (snap, flash, pow, crash, vessel, shine)

### FASE 7.5 — UI/UX Polish + Brand Identity (executada em 2026-06-10, ver entrada acima)
Plano detalhado no ATTACK_PLAN.md. Itens:
1. ~~Light mode como padrão ao acessar~~ FEITO
2. Header mais disruptivo (menos espaço vazio, mais impacto) — PENDENTE (criativo, precisa feedback visual)
3. ~~Paleta brand Athos em TODOS os presets default (light mode)~~ FEITO
4. ~~Fix: edição de hex nos color pickers (não aceita digitação)~~ FEITO
5. ~~Fix: gravação MP4/WebM em todas as ferramentas~~ FEITO (stability pass)
6. ~~Auditoria geral de bugs (travamentos, memória, performance)~~ FEITO (stability pass)
7. ~~Cards dos menus: fundo teal `#2b8a7c`, letra inicial em âmbar `#D4A040`~~ FEITO
8. ~~Botão Voltar em TODAS as 28 páginas~~ FEITO

---

## 2026-05-25

### Pesquisa Competitiva + Roadmap Atualizado
- Pesquisa de concorrentes: Space Type Generator, Munken Creator, Typeflow, Found Tools, Bracken Overlayers
- Análise do Cavalry: easing curves, duplicator+falloffs, noise behaviors, physics, real-time performance
- **Cavalry NÃO é engenharia reversa** — é software nativo C++ compilado. As técnicas são algoritmos públicos de computer graphics
- Features gap identificadas: custom font upload, GIF export, mouse interaction, share via URL, image→3D depth
- ATTACK_PLAN atualizado com Fases 7-11:
  - **Fase 7 (próxima):** Cavalry-level polish (easing curves, mouse interaction, organic noise, transições suaves)
  - **Fase 8:** Novas Visual Tools (Depth/3D, Gradient Map, Pixel Sort, CMYK Halftone)
  - **Fase 9:** Features transversais (custom fonts, GIF, share URL, fullscreen)
  - **Fase 10:** Refinamento visual (match Space Type Generator)
  - **Fase 11:** Expansão (Pattern Gen, Color Palette, Mockup Compositor)
- Estratégia: **polir os 22 modos existentes ANTES de criar ferramentas novas**

---

## 2026-05-24 / 2026-05-25

### Visual Tools — Reestruturação completa
- **Removidos:** Duotone e Grain (muito rasos — não tinham video, webcam, nem profundidade de controle)
- **Reescritos do zero:** Retícula, Glitch, ASCII — agora com image+video+webcam input, MP4 recording, drag&drop, presets significativos
  - **Retícula:** 11 shapes, multi-tone color, contrast, angle, gap. 9 presets
  - **Glitch:** RGB shift, pixel sort, slicing, scanlines, color bleed, noise. 8 presets
  - **ASCII:** 4 charsets (standard/blocks/braille/custom), 3 color modes. 8 presets
- **Overlay Generator (NOVO):** Gerador de texturas procedurais seamless tileable
  - 12 patterns: film grain, fine noise, paper, linen, halftone, grid, crosshatch, scanlines, stipple, concrete, dust & scratches, canvas weave
  - Image/video/webcam source + live compositing (textura sobre mídia)
  - 3 exports: PNG composite (resolução original), Tile PNG (seamless), Record MP4
  - 8 presets: Subtle, Medium, Heavy, Photo Film, Print, Digital, Vintage, Editorial
  - Blend mode source-over com opacity slider (imagem nunca desaparece)
  - Double-click randomiza seed

### Gravação MP4 — Fix definitivo
- **Problema:** Canvas WEBGL com VideoEncoder produzia 0 frames ("Flushing 0 frames" infinito)
- **Root cause:** drawImage() de canvas WEBGL sem preserveDrawingBuffer retorna pixels vazios
- **Solução:** Detecção automática — canvas 2D usa VideoEncoder+mp4-muxer (MP4 direto), canvas WEBGL usa MediaRecorder+captureStream (WebM ou MP4 nativo no Chrome 130+)
- **Resultado:** Animação não trava durante gravação, stop é instantâneo, download imediato
- preserveDrawingBuffer adicionado em todos os 10 modos WEBGL (pra savePNG funcionar)

### Landing Page — Melhorias visuais
- **Home:** Painel Kinetic Type agora tem vídeo MP4 real do Cylinder como background (75% opacidade)
- **Quadrante 3D:** Vídeo MP4 real como background (60% opacidade)
- **Animações dos 4 quadrantes:** Multi-layer com mais opacidade e drama
  - 3D: 4 camadas text com 3D rotation, flag wave, accent color
  - 2D: text distortion + 3 stripe ribbons animados
  - Composition: 3 anéis orbitais + 4 letras T-I-P-Ó flutuando
  - Animation: 5 chars com explode, snap, flash, fall, bounce
- **Mode cards:** Mini-animações CSS únicas por modo (22 @keyframes)
- **Labels:** #99E0D2 mint no dark mode, preto no light mode
- **Card titles:** #99E0D2 mint no dark mode, preto no light mode

### Dark/Light Theme
- CSS variables no shared/style.css: `:root[data-theme="light"]` com paleta completa invertida
- Toggle button (☼/☾) fixo no canto superior direito, persiste via localStorage
- Sincroniza entre todas as páginas
- Dithering: light mode via CSS overrides (panel bg, text, scrollbar, section titles)
- Botões .btn: cor adaptativa (não mais hardcoded #000)

### Fase 6 — Polish
- Favicon SVG (T monospace) em todas as 27 páginas
- Meta tags (description + theme-color) em todas as páginas
- Responsividade básica: panel colapsável em mobile via CSS media query
- README.md público

---

## 2026-05-23

### Refinamento Ribbon — match Space Type Generator
- Adicionado controle **B-side/Text** separado no `ribbon.html`
- `Weight` funcional: letras renderizadas como textura stroked com cache por caractere/cor
- Texto curto repetido internamente para preencher a fita sem sobrescrever campo Text
- `rectMode(CENTER)` para alinhar com geometria do STG original
- Presets atualizados com cores do STG

### Refinamento Cascade + Morisawa
- `Weight` funcional em ambos — caracteres como glyphs stroked/escalados
- Presets limpos: não sobrescrevem texto customizado

### CrashClock — Display Particles high-end
- Refeito com modo Particles: centenas de círculos com colisão, containment circular, gravidade vetorial
- Ponteiros empurram partículas, hub em camadas
- 6 presets: Particles, Silk, Dense, Hours, Text, Pride

---

## 2026-05-20 / 2026-05-21

### Infraestrutura
- shared/ui.js criado — TipoUI com formatters declarativos, preset handling, recorder init, export helpers
- Eliminou ~1400 linhas de boilerplate duplicado nas 4 páginas core
- 32 squads instalados em .claude/skills/

### Fase 1 Completa — 4 Kinetic Type Modes Core
- **Cylinder:** 21 controles, 8 presets, p5.js WEBGL
- **Field:** 21 controles, 7 presets, p5.js WEBGL, Z-surface auto-rotation
- **Stripes:** 13 controles + 5 colors, 11 presets, p5.js 2D, ribbon shadows
- **Coil:** 13 controles + 5 colors, 11 presets, p5.js 2D, Archimedean spiral

### Fase 2 Completa — 4 Modos 3D Intermediários
- **Flag:** 17 controles, 14 presets, font engine vetorial (precisa refinamento)
- **Cascade:** 8 controles, 12 presets, pirâmide com sinEngine
- **Ribbon:** 15 controles, 13 presets, path Möbius-like 3D
- **Morisawa:** 6 controles, 8 presets, pirâmide expandindo com scroll

### Fase 3 Completa — 3 Modos 2D
- **Layers:** 5 controles, 7 presets, Z-scroll com 4-fold symmetry
- **Danger:** 7 controles, 8 presets, Perlin noise mesh distortion
- **String:** 5 controles, 8 presets, Bezier curve ribbons com texture scrolling

### Fase 4 Completa — 3 Modos Composição
- **Badge:** 15 controles, 9 presets, strip/ring/tunnel/spread layers
- **Clutter:** 5 controles, 7 presets, 6 sub-modes (ring, cloud, cosmic, sphere, scatter, vortex)
- **Construct:** 5 controles, 7 presets, 6 sub-modes (cloud, scribble, zigzag, gradient, box, matrix)

### Fase 5 Completa — 8 Modos Animação
- **Snap:** 4 controles, 5 presets, kinetic letter stagger
- **Flash:** 3 controles, 5 presets, 8 cycling text effects
- **Pow:** 4 controles, 5 presets, explosive particle scatter
- **Crash:** 4 controles, 5 presets, physics falling text
- **Crash Clock:** 4 controles, 5 presets, real-time clock com falling numbers
- **Vessel:** 4 controles, 5 presets, morphing container com 7 easing types
- **Shine:** 5 controles, 5 presets, radial light spokes (WEBGL)
- **Boost:** 4 controles, 5 presets, letter-by-letter directional reveal

### Visual Tools — 5 Ferramentas Originais
- Retícula, Glitch, Duotone, Grain, ASCII (Duotone e Grain removidos depois)

### Engenharia Reversa — Space Type Generator (COMPLETA)
- 22 modos, ~150 presets, 98 arquivos (75 JS + 22 HTML + 1 CSS)

---

## 2026-05-19

### Dithering Tool — Construção Completa (FUNCIONAL)
- Upload imagem/vídeo + webcam + drag & drop
- 7-State Midtone Mapping com SVG customizado por state
- 60+ shapes, 10 shape presets, 24 color palettes
- Export: PNG, SVG, MP4 (8/16 Mbps)
- 4 iterações do sistema de gravação até chegar no v4 final
