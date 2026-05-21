# Tipó — Memória do Projeto

## Info Geral
- **Nome:** Tipó (com acento) — português, curto, universal, personalidade brasileira
- **Repo:** github.com/damelchert/tipo
- **Deploy:** Vercel (auto-deploy on push)
- **Local:** `npx http-server -p 8080` em `/Users/danielmelchert/PROJETOS/tipo`
- **Domínios a verificar:** tipo.tools, tipo.app, tipo.art, tipotype.io

## Estrutura de Arquivos
```
/tipo/
  index.html                   — landing page (navegação progressiva com hash routing)
  dithering.html               — SVG dithering tool (FUNCIONAL)
  cylinder.html                — kinetic type: cylinder (FUNCIONAL)
  field.html                   — kinetic type: field (FUNCIONAL)
  stripes.html                 — kinetic type: stripes (FUNCIONAL)
  coil.html                    — kinetic type: coil (FUNCIONAL)
  flag.html                    — kinetic type: flag (FUNCIONAL — precisa refinamento)
  cascade.html                 — kinetic type: cascade (FUNCIONAL)
  ribbon.html                  — kinetic type: ribbon (FUNCIONAL)
  morisawa.html                — kinetic type: morisawa (FUNCIONAL)
  layers.html                  — kinetic type: layers (FUNCIONAL)
  danger.html                  — kinetic type: danger (FUNCIONAL)
  string.html                  — kinetic type: string (FUNCIONAL)
  badge.html                   — kinetic type: badge (FUNCIONAL)
  clutter.html                 — kinetic type: clutter (FUNCIONAL)
  construct.html               — kinetic type: construct (FUNCIONAL)
  shared/
    style.css                  — design system (#99E0D2 section titles, swap btn, etc)
    recorder.js                — classe TipoRecorder (MP4 recording)
    ui.js                      — TipoUI: sliders, presets, export, recorder init, formatters
  assets/
    fonts/IBMPlexMono-Regular.ttf
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
| Back-pressure via encodeQueueSize | Evita travar render loop |
| Real-time timestamps | Velocidade constante independente de performance |
| RecordCanvas separado | Dimensões fixas durante gravação |
| Bitmap trace pra text-to-shape | Fontes não carregam em SVG-as-Image |
| Baseline H.264 + latencyMode realtime | Encoding rápido, flush instantâneo |
| fill() em vez de stroke() no WEBGL | p5.js text() em WEBGL renderiza como geometria preenchida |
| .ttf em vez de .otf/.woff2 pra p5.js | loadFont() precisa de TTF ou OTF real (não WOFF) |

## Padrões de UI (aplicar em todas as páginas)
- Section titles em **#99E0D2** (cor accent)
- **Presets logo abaixo do campo Text** (primeiro contato do usuário)
- **Botão Reset** vermelho no final dos presets
- **Color pickers + Swap button** logo após presets
- **Swap button** (&#8646;) inverte type/bg colors com 1 clique
- **Header:** Nome do modo + nav links (KINETIC TYPE | HOME) — menu anterior à esquerda, HOME à direita
- **Dithering header:** VISUAL TOOLS | HOME
- Todos os presets usam **TIPÓ** como texto default (nunca sobrescrever com texto custom)
- MP4 recording + PNG export em todas as páginas
- Texto default: TIPÓ (sempre)

---

## 2026-05-20

### Fase 1 Completa — 4 Kinetic Type Modes

**Cylinder** (FUNCIONAL)
- 21 controles: Cylinder (radius, count, rotate, offset), Wave (count, speed, latitude, longitude, ripple, x/y scale), Type (x/y scale, weight), Tweak (x/y/z rotation), Camera (x/y/z rotation, zoom)
- 8 presets + Reset: Simple, Jellyfish, Crown, Complex, Weave, Zebra, Hoops, Pride
- Bug fix: fonte .otf baixou como HTML → .ttf do Google Fonts GitHub
- Bug fix: text() WEBGL precisa fill() não stroke()

**Field** (FUNCIONAL)
- 21 controles: Grid (columns, rows, tracking, line space), Type (x/y scale, weight), Wave (speed, x/y freq), Amplitude (z/x/y axis, z smooth, x stretch, x/y stretch wave, offsets), Camera
- 7 presets + Reset: Stacks, Bricks, Simple Z, Complex Z, Zebra, Harlequin, Pride
- Auto-rotation to follow Z surface (rotateY/rotateX based on neighboring Z values)
- Full text toggle (fill entire grid or single text run)

**Stripes** (FUNCIONAL)
- 13 controles + 5 color slots: Type (x/y scale, weight, tracking), Ribbon (count, x/y space, size, offset), Wave (size, speed, wavelength, slope)
- 11 presets + Reset: Marquee, Subway, Wow, Stacks, Old Sea, Color Sea, Simple Wave, Simple Wave 2, Not So Weird, Racer, Pride
- 2D mode (sem WEBGL) — colored ribbons with text auto-rotating to follow curve
- Shadow layer behind each ribbon
- sinEngine with adjustable slope for square/round wave shapes

**Coil** (FUNCIONAL)
- 13 controles + 5 color slots: Type (x/y scale, weight), Ribbon (count, size, hide, flat caps), Spiral (radius, spacing, start, spin), Wave (size, count, speed, slope)
- 11 presets + Reset: Wide, Super, Amoeba, Spacer, Kitty, Hourglass, Star, ZZtar, Pretzel, Lemniscate, Pride
- Archimedean spiral with radial wave distortion
- Thicker ribbons (ribSize default 25, max 80) for solid spiral look

### Fase 2 Completa — 4 Kinetic Type Modes (3D Intermediários)

**Flag** (FUNCIONAL — precisa refinamento)
- 17 controles: Type (x/y scale, weight, rows, padding, ribbon depth, text-only), Wave (x/y/z size, offset, speed, row offset, slope), Camera (x/y/z rotation, zoom)
- 14 presets + Reset: A Banner, A Twist, Folds, Flat Sea, Barber, Silos, Mystery, Cola Waves, Origami, Origami 2, B&W, Newsprint, Edge Case, Pride
- 3D waving flag surface — text via font engine vetorial (drawChar com bilinear interpolation nos 4 corners)
- Ribbon = filled quad unpadded atrás (Z=-typePush), texto = stroke padded na frente
- sinEngine com slope easing, multi-color cycling por row
- Nota: font engine vetorial simplificado — precisa refinamento para match exato com Space Type Generator

**Cascade** (FUNCIONAL)
- 8 controles: Type (x-scale, weight, tracking, line space), Grid (rows, mirror, gradient, text-only), Wave (length, speed, slope)
- 12 presets + Reset: Checker, Cascade, Classic, Mosaic, Ticker, Run, Salmon, Grid, Web Art, Sparkle, Pixel Gradient, Pride
- 2D mode (sem WEBGL) — pirâmide de texto com row heights controlados por sinEngine
- Triangular number formula para distribuição vertical: step = rows*(rows+1)/2
- Mirror mode duplica grid invertido, gradient mode interpola cores entre rows
- Presets todos usam TIPÓ como texto default

**Ribbon** (FUNCIONAL)
- 15 controles: Type (height, tracking, weight), Ribbon (seg space, seg count, depth, stretch, count, z-space, x-space, alternate, back side, text-only, gradient), Animation (speed), Camera (scale, x/y/z rotation)
- 13 presets + Reset: Basic, Streamers, Terrace, Link, Sea, River, Web Art, Primary, Snake, Hot/Cold, Track, Track II, Pride
- 3D WEBGL com projeção ortográfica — path Möbius-like com 4 segmentos (2 retos + 2 curvos)
- Texto flui ao longo do path como esteira, múltiplas ribbons com z-spacing
- Gradient color interpolation ao longo da ribbon

**Morisawa** (FUNCIONAL)
- 6 controles: Rows, Weight, Tracking, Line Space, Matte, Scroll Speed + 3 checkboxes (Mirror, Flip Speed, Row Flux)
- 8 presets + Reset: Moon, Post Space, X, Bridge, Whitney, Beach, Recede, Pride
- 2D mode — pirâmide expandindo: row j tem j+1 cópias do texto
- Cada row scrolla a velocidade diferente: speed * (rows - j) — top = rápido, bottom = lento
- Flux mode: rows oscilam sinusoidalmente via sinEngine
- Matte borders para clip de overflow
- Wrap-around seamless para scroll contínuo

### Fase 2 — Primeiro modo: Flag

**Flag** (FUNCIONAL)
- 17 controles: Type (x/y scale, weight, rows, padding, ribbon depth, text-only toggle), Wave (x/y/z size, offset, speed, row offset, slope), Camera (x/y/z rotation, zoom)
- 14 presets + Reset: A Banner, A Twist, Folds, Flat Sea, Barber, Silos, Mystery, Cola Waves, Origami, Origami 2, B&W, Newsprint, Edge Case, Pride
- 3D waving flag surface — text on deformable quad grid, per-corner wave deformation
- sinEngine with slope easing, multi-color cycling by row, ribbon depth with back face
- Padding = lerp corners toward center (shrink cells)
- Auto-rotation of text to follow deformed surface normal
- First mode to use TipoUI.init() from shared/ui.js

### UI Polish (aplicado em todas as páginas)
- Section titles: #99E0D2 accent color
- Presets movidos pra logo abaixo do Text input
- Botão Reset vermelho no final dos presets
- Color pickers + Swap button após presets (Cylinder, Field) / na seção Colors (Stripes, Coil)
- Header nav: KINETIC TYPE (esquerda) | HOME (direita)
- Dithering: VISUAL TOOLS (esquerda) | HOME (direita)
- Todos presets mantêm TIPÓ como texto (corrigido: *SUPER*, SPACE *, Hello?, etc → TIPÓ)

### Infraestrutura & Deploy
- Git repo: github.com/damelchert/tipo
- Deploy: Vercel (auto-deploy on push)
- shared/style.css — design system com CSS variables, swap-btn, color-section-row
- shared/recorder.js — classe TipoRecorder reutilizável
- Landing page: navegação progressiva com hash routing (#kinetic, #visual, #3d, etc)
- Keyboard nav: ESC/Backspace volta nível

### Naming & Branding
- Nome definido: **Tipó** (brand-squad consultado, 40+ sugestões)

### Engenharia Reversa — Space Type Generator (COMPLETA)
- 22 modos, ~150 presets, 98 arquivos (75 JS + 22 HTML + 1 CSS)
- Docs: `tipo_vault/knowledge/spacetype_reverse_engineering.md`
- Source: `tipo_vault/knowledge/spacetype_src/`

### Organização
- Pasta: `dithering tool` → `tipo`
- Vault: `dithering_vault` → `tipo_vault`
- Unificado memoria.md (deletado PROJECT_MEMORY.md duplicado)
- Deletados templates vazios do vault (MEMORIA.md, PROJECT.md)

---

## 2026-05-19

### Dithering Tool — Construção Completa (FUNCIONAL)
- Criado do zero como single HTML file
- Análise de 32 screenshots (2 vídeos do @antoncreations)

**Features:**
- Upload imagem/vídeo + webcam + drag & drop
- 7-State Midtone Mapping (highlights → shadows) com SVG customizado por state
- Grid resolution, overall scale, aspect ratio (original/1:1), background color
- Fill solid, invert mapping, scale with midtones, 90° snap rotation
- Shape Library: 60+ shapes em 7 categorias
- Text-to-Shape: bitmap trace
- 10 shape presets + 24 color palettes + hex copiável
- Export: PNG, SVG, MP4 (8/16 Mbps)

**Gravação de Vídeo (4 iterações até chegar na v4 final):**
- v4: MP4 em tempo real, back-pressure control, real-time timestamps, recordCanvas fixo, progress bar, timer visual

**Problemas resolvidos:**
1. CDN bloqueado em file:// → UMD script tag
2. Vídeo travava → back-pressure via encodeQueueSize
3. Vídeo acelerava → real-time timestamps + recordCanvas fixo
4. Text SVG não renderizava → bitmap trace
5. WebM sem duração → gravar direto em MP4
