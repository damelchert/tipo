# Tipó — Plano de Ataque

## Visao Geral
28 ferramentas ativas: 6 visual tools + 22 kinetic type modes.
Cada uma como pagina HTML independente, com shared CSS/JS.
Landing page (index.html) como hub central.
Deploy: Vercel (auto-deploy on push).

## Status por Fase

### FASE 0 — Infraestrutura ✅
- [x] `shared/style.css` — design system (#99E0D2, dark/light theme, responsive)
- [x] `shared/recorder.js` — TipoRecorder (MP4 2D / WebM WEBGL / MP4 nativo Chrome 130+)
- [x] `shared/ui.js` — TipoUI: sliders, presets, export, recorder, theme toggle
- [x] `index.html` — landing page com hash routing + video previews
- [x] Git repo + Deploy Vercel
- [ ] Migrar `dithering.html` pra usar shared CSS/JS

### FASE 1-5 — 22 Kinetic Type Modes ✅
Todos implementados e funcionais. Ver detalhes na memoria.md.

### FASE 6 — Polish ✅
- [x] Favicon + meta tags + README + responsividade + dark/light theme
- [ ] Domínio custom — ação do Daniel

### VISUAL TOOLS ✅
- [x] **DITHERING** — Gold standard. 7-state luminance, 60+ shapes, video+webcam, MP4/PNG/SVG
- [x] **RETÍCULA** — 11 shapes, multi-tone, video+webcam, 9 presets
- [x] **GLITCH** — RGB shift, pixel sort, slicing, scanlines, video+webcam, 8 presets
- [x] **ASCII** — 4 charsets, 3 color modes, video+webcam, 8 presets
- [x] **OVERLAY** — 12 patterns seamless, image+video+webcam, live compositing, tile export

---

## PRÓXIMAS FASES

### FASE 7 — Cavalry-Level Polish ✅ (elevar qualidade dos 22 modos existentes)

O objetivo é fazer cada modo do Tipó ter a fluidez e profissionalismo do Cavalry.
Atacar ANTES de criar ferramentas novas — polir o que existe primeiro.

#### 7.1 — Easing Curves profissionais ✅
- `TipoEase` library em shared/ui.js — 10 curvas (sine, quad, cubic, quart, quint, expo, circ, back, bounce, elastic)
- 3 direções: `in`, `out`, `inOut`
- Lookup dinâmico: `byIndex(idx, dir)` e `byName(name, dir)`
- Slider "Easing" adicionado em: Snap, Flash, Pow, Boost, Vessel
- Vessel migrado de 7 funções locais para TipoEase compartilhado (expandido 7→10 curvas)
- **Status:** [x] Implementado

#### 7.2 — Mouse Interaction ✅
- `TipoMouse` system em shared/ui.js — smoothed normalized coords (-1 to 1)
- Touch support (mobile via touchmove/touchend)
- Checkbox "Mouse React" + slider "Strength" opt-in
- **Field:** Letters repel from cursor (force inversamente proporcional à distância)
- **Danger:** Distortion center follows mouse position
- **Pow:** Explosion + assembly center follows mouse
- **Status:** [x] Implementado (Field, Danger, Pow) — expandir para Clutter depois

#### 7.3 — Noise orgânico ✅
- `TipoNoise` system em shared/ui.js — 3-harmonic sine-based jitter
- `jitter(seed, scale)` e `jitter2D(seed, scale)`
- Slider "Organic" (0-100) — controla intensidade do jitter
- Aplicado em: Snap (position + rotation), Boost (position), Flash (position)
- **Status:** [x] Implementado (Snap, Boost, Flash) — expandir para mais modos depois

#### 7.4 — Transições suaves entre presets ✅
- `applyPreset()` refatorado em shared/ui.js — morph de 300ms com TipoEase.inOut.cubic
- Captura estado antes/depois, anima sliders + colors simultaneamente
- `_lerpHex()` para interpolação suave de cores
- Funciona automaticamente em TODAS as 27 ferramentas
- **Status:** [x] Implementado

### FASE 7.5 — UI/UX Polish + Brand Identity (executada em 2026-06-10 — falta só 7.5.2 e smoke test visual)

Prioridade máxima — arrumar experiência antes de features novas.

#### 7.5.1 — Light mode como padrão
- [x] Mudar default do localStorage para `light` em todas as tools (+ base do :root no CSS invertida pra light, sem flash)
- [x] Manter toggle dark/light funcionando
- [ ] Testar TODAS as 28 ferramentas em light mode (smoke test visual pendente)

#### 7.5.2 — Header disruptivo (PENDENTE — criativo, precisa feedback visual do Daniel)
- [ ] Melhorar GSAP animations do header (mais impacto, menos espaço vazio)
- [ ] Ghost text mais expressivo
- [ ] Animação da linha gradient mais impactante

#### 7.5.3 — Paleta brand nos presets default
- [x] TODAS as ferramentas devem abrir com cores da paleta Athos (light mode):
  - Background: `#F8F5F0`, texto: `#1A1818`, accent: `#2A8A7A`, stroke: `#D4A040`
- [x] Presets criativos mantêm suas paletas próprias — só o default muda (resetAll também atualizado)
- [x] Auditar os 28 arquivos HTML um por um (109 color inputs; exceções: overlay baseColor, dithering)

#### 7.5.4 — Fix: edição de hex nos color pickers
- [x] Solução: campo de texto hex ao lado do color picker (TipoUI.initHexInputs, sync bidirecional + morph de presets)

#### 7.5.5 — Fix: gravação MP4/WebM
- [x] Coberto pelo stability pass de 2026-06-10 (race do _stopping, guard document.hidden, revoke timeout)

#### 7.5.6 — Auditoria geral de bugs
- [x] Coberto pelo stability pass de 2026-06-10 (leaks de object URL, AudioContext, p5.Graphics, TipoMouse, RAF stacking)

#### 7.5.7 — Cards dos menus: identidade visual
- [x] Visual Tools cards: preview fundo `#2b8a7c` (teal), letra inicial em âmbar `#D4A040`
- [x] Kinetic Type quadrantes: fundo teal, canvases desenhando em âmbar
- [x] Animações/ícones existentes preservados (vars --text-* remapeadas no escopo do preview)

#### 7.5.8 — Botão Voltar em todas as páginas
- [x] Botão flutuante `←` consistente em TODAS as 28 ferramentas (TipoUI.initBackButton + manual em overlay/dithering)
- [x] Retorna ao menu correto (Visual Tools ou categoria Kinetic); back-links dos painéis corrigidos pra categoria certa

---

### FASE 8 — Dithering Engine Pro (inspirado na análise do Dither Boy)

Engenharia reversa do Dither Boy 6.0.3 (Electron app, Studio AAA) revelou:
- 73 algoritmos de dithering (bytecode protegido, mas todos são algoritmos públicos)
- Pipeline de 9 efeitos encadeados (código extraído do imageProcessor.worker.js)
- 82 paletas de cores (dados extraídos)
- Metadados completos (controles, ranges, defaults) dos 73 algoritmos
- Efeitos como Epsilon Glow, Chromatic Aberration, JPEG Glitch (código legível)

Fonte da análise: `/tmp/ditherboy-src/` (app.asar extraído)

#### 8.1 — Pipeline de Efeitos Encadeado no dithering.html
Refatorar dithering.html para suportar pipeline multi-estágio:
- **Adjustments** (pre): brightness, contrast, saturation, midtones, highlights, hue, blur, denoise
- **Dither** (core): algoritmo selecionado + paleta
- **Post-Processing**: sharpen, blur, invert, hue shift
- **Tint/Color Overlay**: cor + 16 blend modes (multiply, screen, overlay, dodge, burn, soft-light, etc.)
- **Referência:** Pipeline do Dither Boy (código extraído, legível)
- **Status:** [ ] A implementar

#### 8.2 — Error Diffusion Clássicos (algoritmos públicos)
Implementar os algoritmos de error diffusion a partir dos papers originais:
- **Floyd-Steinberg** (1976) — O mais usado, referência universal
- **Atkinson** (1984) — Estética Macintosh, alto contraste
- **Stucki** (1981) — Distribuição ampla, qualidade alta
- **Burkes** (1988) — Distribuição horizontal balanceada
- **Sierra / Sierra Lite / Two-Row Sierra** — Variações de peso
- **Jarvis-Judice-Ninke** (1976) — Distribuição 12-pixel
- **Controles comuns:** Serpentine scan toggle, Error strength slider
- **Referência:** Papers originais + metadados extraídos do Dither Boy (ranges, defaults)
- **Status:** [ ] A implementar

#### 8.3 — Ordered Dithering + Patterned
- **Bayer Matrix** (2x2, 4x4, 8x8, 16x16) — Paper de Bayer 1973
- **Bit Tone** — Dots por nível de cinza
- **Crosshatch** — Linhas cruzadas por luminância
- **Stippling** — Pontos randômicos weighted
- **Diamond / Checkers** — Padrões geométricos
- **Status:** [ ] A implementar

#### 8.4 — COLOR HALFTONE (CMYK)
Imagem → separação CMYK com dots em ângulos diferentes por canal.
- **Técnica:** 4 passes (C/M/Y/K) com supersampling anti-aliased + dot gain
- **Controles:** Cell size, dot gain, ângulos por canal (C:15° M:75° Y:0° K:45°), GCR, supersample
- **Referência:** Código extraído do Dither Boy (halftone completo no worker) + processo offset real
- **Video+webcam input**
- **Status:** [ ] A implementar

#### 8.5 — Epsilon Glow (efeito exclusivo extraído)
Glow seletivo baseado em luminância com distance map:
- **Técnica:** Luminance threshold → soft mask → distance map → gaussian blur (aspect-aware) → weighted composite
- **Controles:** Threshold, smoothing, radius, intensity, aspect ratio, direction, falloff, epsilon, distance scale
- **Referência:** Código completo extraído do Dither Boy worker (funções legíveis)
- **Status:** [ ] A implementar

#### 8.6 — RISOGRAPH (EXCLUSIVO TIPÓ — não existe no Dither Boy!)
Simulação de impressão Risograph no browser:
- **Separação de tintas:** 1-3 cores spot (Pantone Riso: vermelho, azul, preto, verde, pink, etc.)
- **Misregistration:** Registro imperfeito entre camadas (offset X/Y randômico por camada)
- **Textura de grão:** Grain da tinta Riso (não é noise digital — é textura orgânica)
- **Overprint:** Cores se misturam onde sobrepõem (multiply blend)
- **Halftone por camada:** Cada cor pode ter halftone independente
- **Controles:** Cores (picker + presets Riso), misregistration amount, grain intensity, halftone size, overprint opacity
- **Presets:** Classic Riso (red+blue), Zine (black+pink), Poster (3 cores), Editorial, Punk
- **Image+video+webcam input**
- **Export:** PNG (composite), PNG por camada (separação), MP4
- **Status:** [ ] A implementar — FEATURE EXCLUSIVA

#### 8.7 — Paletas de Cores Expandidas
Incorporar paletas curadas ao dithering.html:
- 82 paletas extraídas do Dither Boy (RGB values — são dados, não código)
- Categorias: Retro, Nature, Neon, Pastel, Monochrome, Film, etc.
- Formato: Array de hex colors por paleta
- **Status:** [ ] A implementar

#### 8.8 — Efeitos Glitch Avançados (códigos extraídos)
Turbinar o glitch.html existente com efeitos do Dither Boy:
- **Block Shift** — Deslocamento de blocos 8x8 randômico
- **Block Scramble** — Embaralha blocos da imagem
- **Channel Swap** — Troca canais RGB por bloco
- **Scanline Offset** — Deslocamento horizontal por scanline
- **Interlace Corruption** — Corrupção de linhas entrelaçadas
- **Chromatic Aberration** — Displacement per-channel (R/G/B independentes)
- **Referência:** Código completo extraído (funções legíveis no worker)
- **Status:** [ ] A implementar

#### 8.9 — AUDIOTYPE (Audio Visualizer Tipográfico — EXCLUSIVO TIPÓ)
Tipografia reativa a áudio — letras compostas por barras coloridas que pulsam com a música.
Inspirado no "Line Dither Engine" do @antoncreations (Instagram reel).
- **Conceito:** Upload letra/texto + upload áudio → barras horizontais/verticais cujo tamanho reage às frequências
- **Como funciona:**
  1. Texto renderizado em canvas offscreen
  2. Imagem do texto amostrada em grid (colunas × linhas)
  3. Luminosidade de cada célula → altura/largura da barra
  4. Áudio via Web Audio API → AnalyserNode → frequencyData
  5. Bandas de frequência mapeadas para as barras (graves=esquerda, agudos=direita OU por linha)
  6. Barras pulsam: tamanho base (luminosidade) × multiplicador do áudio
- **Modos de grid:**
  - Horizontal bars (como no reel — barras empilhadas)
  - Vertical bars (colunas lado a lado)
  - Pixel grid (quadrados)
- **Níveis de cor:** 4 ou 8 faixas de luminosidade, cada uma com cor customizável
  - Ex: shadows=#000, darks=#purple, mids=#orange, highlights=#white
  - Presets de paleta: Neon, Mono, Warm, Cool, Pride
- **Controles:**
  - Grid density (quantas barras/colunas)
  - Gap (espaço entre barras)
  - Min/Max size (range do tamanho das barras)
  - Shrink axis (height vs width vs both)
  - Dynamic shrink (barras encolhem/crescem com o áudio)
  - Audio intensity (sensibilidade ao áudio)
  - Audio frequency range (graves vs agudos vs full)
  - Smoothing (suavização da reação ao áudio)
  - 4 ou 8 color levels
- **Inputs:**
  - Texto digitado (renderizado com font) OU upload de imagem/letra custom (JPG/PNG)
  - Upload de áudio (MP3/WAV) OU microfone em tempo real
- **Export:**
  - PNG (frame estático — a letra em barras, sem áudio)
  - JPG por letra individual (para compor no After Effects)
  - MP4 (vídeo com áudio, gravação em tempo real via TipoRecorder)
- **Presets:** Equalizer, Waveform, Spectrum, Pulse, Minimal
- **Diferencial vs reel original:** O cara usa Gemini+After Effects (multi-step manual). Tipó faz tudo no browser, em tempo real, com export direto.
- **Stack:** Web Audio API (AnalyserNode + FFT), Canvas 2D, TipoRecorder
- **Status:** [ ] A implementar — FEATURE EXCLUSIVA

#### 8.10 — DEPTH (Image → 3D) 
Upload imagem 2D → gera depth map → cria mesh 3D interativo.
- **Técnica:** Fragment shader com depth map displacement (Codrops approach)
- **Depth map:** AI via TensorFlow.js (DepthAnything/MiDaS) OU upload manual
- **Interação:** Mouse/touch parallax, gyroscope mobile, rotation
- **Controles:** Displacement strength, mesh resolution, rotation speed, zoom, lighting
- **Export:** PNG (screenshot 3D), MP4 (rotation loop), depth map PNG
- **Stack:** three.js ou raw WebGL, nada de p5.js (performance)
- **Status:** [ ] A implementar

#### 8.11 — GRADIENT MAP
Upload imagem → mapeia luminosidade pra paleta de cores custom.
- **Diferente do Duotone (removido):** N cores, não 2. Gradiente completo.
- **Controles:** 5-10 color stops arrastáveis, curva de contraste, mix com original
- **Referência:** Gradient Map do Photoshop
- **Video+webcam input**
- **Status:** [ ] A implementar

#### 8.12 — PIXEL SORT
Upload imagem/video → pixel sorting artístico.
- **Técnica:** Ordena pixels por brightness/hue/saturation em faixas
- **Controles:** Direction (H/V/diagonal), threshold, sort by (brightness/hue/sat), range
- **Referência:** Kim Asendorf pixel sorting, glitch art community
- **Video+webcam input**
- **Status:** [ ] A implementar

### FASE 9 — Features Transversais (todas as ferramentas)

#### 9.1 — Custom Font Upload
- Upload de .ttf/.otf/.woff2 via drag & drop
- loadFont() do p5.js aceita TTF/OTF
- Fallback pra IBM Plex Mono se falhar
- **Impacto:** Alto — criadores querem suas fontes
- **Status:** [ ] A implementar

#### 9.2 — GIF Loop Export
- Gravar N frames → encodar como GIF animado
- Lib: gif.js (WebWorker-based) ou CCapture.js
- Botão "Export GIF" ao lado de PNG/MP4
- Loop perfeito: calcular ciclo baseado em speed/frameCount
- **Impacto:** Alto — formato mais compartilhável em redes sociais
- **Status:** [ ] A implementar

#### 9.3 — Share via URL
- Serializar estado dos sliders + cores + preset no URL hash
- Ex: `cylinder.html#r=250&s=8&c=ff0000`
- Botão "Copy Link" que copia URL com state
- **Impacto:** Alto — compartilhar criações sem export
- **Status:** [ ] A implementar

#### 9.4 — Fullscreen Mode
- Botão F para fullscreen (esconde panel, canvas 100vw×100vh)
- ESC pra sair
- **Status:** [ ] A implementar

### FASE 10 — Refinamento Visual (match com Space Type Generator)

#### Prioridade Alta
- [ ] **FLAG** — Font engine vetorial completo (keyboardEngine_corners com bilinear interpolation)
- [ ] **CASCADE** — Match visual fino com original (row height, spacing, color cycling)
- [ ] **MORISAWA** — Ajuste fino de flux/wrap/tracking

#### Prioridade Média
- [ ] Refinamento Fases 3-5 (Layers, Danger, String, Badge, Clutter, Construct, Snap, Flash, Pow, Crash, Vessel, Shine, Boost)
- [ ] Cada modo precisa: testar todos os presets, comparar side-by-side com STG, ajustar

### FASE 11 — Expansão de Ferramentas Criativas

#### 11.1 — Pattern Generator
- Geração de padrões geométricos repetitivos (tessellation)
- Controles: shape, repetition, rotation, scale, color palette
- Export como PNG tileable + SVG
- **Status:** [ ] Conceito

#### 11.2 — Color Palette Generator
- Upload imagem → extrai paleta dominante (5-10 cores)
- Gera paletas complementares, análogas, triádicas
- Export como ASE (Adobe), CSS variables, JSON
- **Status:** [ ] Conceito

#### 11.3 — Mockup Compositor
- Upload arte 2D + seleciona mockup (poster, camiseta, tela, cartão)
- Perspectiva + lighting automáticos
- Inspirado no Brand Forge mas simplificado (sem IA)
- **Status:** [ ] Conceito

---

## Análise Competitiva

### Concorrentes Mapeados

| Player | URL | O que faz bem | O que o Tipó faz melhor |
|--------|-----|---------------|------------------------|
| **Space Type Generator** | spacetypegenerator.com | Font engine vetorial, GIF loop, 22 modos maduros | Video+webcam input, Visual Tools (dithering, glitch, etc), dark/light theme |
| **Munken Creator** | patrik-huebner.com | Backgrounds+tipo juntos, reactive mouse, high-res download | Mais modos, export MP4, ferramenta completa (não só tipo) |
| **Typeflow** | typeflow.tools | Templates de artistas, paletas curadas, Cavalry engine | Independente (sem Cavalry), mais modos, visual tools |
| **Found Tools** | found-tools.com | Output como CSS copiável | Mais visual, 3D, animação, não só CSS |
| **Bracken Overlayers** | bracken.design | Texturas overlay profissionais (£15) | Tipó gera as texturas grátis no browser |
| **Dither Boy** | ditherboy.com | 73 algoritmos dithering, pipeline 9 efeitos, 82 paletas, CMYK halftone, Epsilon Glow, Electron desktop app | Tipó é web (zero install), tem video+webcam, kinetic type, Risograph (exclusivo), grátis |

### Features Exclusivas do Tipó (ninguém mais tem)
1. **Visual Tools + Kinetic Type** na mesma plataforma
2. **Video + Webcam** como source em todas as ferramentas
3. **MP4 recording nativo** (sem ffmpeg, sem servidor)
4. **Overlay Generator** procedural seamless (substitui packs pagos)
5. **27 ferramentas** em HTML puro sem build tools
6. **Risograph simulator** no browser (planejado — Fase 8.6)
7. **Zero install** — 100% web, não precisa baixar app desktop
8. **Easing curves profissionais** com 10 curvas + 3 direções em todos os modos
9. **Mouse interaction** reativa em modos kinetic type

### Features que a concorrência tem e o Tipó não
1. Font engine vetorial (STG) → **Fase 10**
2. GIF export loop → **Fase 9.2**
3. Custom font upload → **Fase 9.1**
4. Mouse interaction → **Fase 7.2** ✅ (implementado em Field, Danger, Pow)
5. Share via URL → **Fase 9.3**
6. Image → 3D depth mesh → **Fase 8.9**
7. 73 algoritmos de dithering (Dither Boy) → **Fase 8.2/8.3** (implementar via papers públicos)
8. Pipeline de efeitos encadeado (Dither Boy) → **Fase 8.1**
9. CMYK Halftone profissional (Dither Boy) → **Fase 8.4**
10. Risograph → **Fase 8.6** (EXCLUSIVO TIPÓ — ninguém tem)

---

## Padrao de UI (aplicar em TODAS as paginas novas)
- Section titles em #99E0D2 (dark) / #000 (light)
- Card titles em #99E0D2 (dark) / #000 (light)
- Presets logo abaixo do campo Text
- Botao Reset vermelho no final dos presets
- Color pickers + Swap button apos presets
- Header: NomeDoModo + KINETIC TYPE (esq) | HOME (dir)
- Visual Tools: VISUAL TOOLS (esq) | HOME (dir)
- Texto default: TIPÓ (nunca sobrescrever nos presets)
- MP4/WebM recording + PNG export
- Theme toggle (☼/☾) top-right, persiste via localStorage
- Botão .btn usa color: var(--bg-0) pra ambos os temas
- Image+video+webcam input em todas as Visual Tools

## Referencias
- Space Type Generator source: `tipo_vault/knowledge/spacetype_src/`
- Eng reversa completa: `tipo_vault/knowledge/spacetype_reverse_engineering.md`
- Dithering refs: `tipo_vault/knowledge/screeshots/` e `screenshots 2/`
- Codrops fake 3D: tympanus.net/codrops/2019/02/20/how-to-create-a-fake-3d-image-effect-with-webgl/
- TensorFlow.js Depth: blog.tensorflow.org/2022/05/portrait-depth-api
- Munken Creator: patrik-huebner.com/generative-design/munken-creator
- Typeflow: typeflow.tools
