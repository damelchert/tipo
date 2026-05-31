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
    recorder.js                — TipoRecorder (MP4 via VideoEncoder para 2D, WebM via captureStream para WEBGL)
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

### Próximo: Header redesign
- Header atual é flat demais — precisa ser mais disruptivo
- Pesquisar GSAP (GreenSock Animation Platform) para animações premium
- Objetivo: header que transmita a identidade visual + convide à exploração

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
