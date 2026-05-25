# Tipó — Plano de Ataque

## Visao Geral
27 ferramentas ativas: 5 visual tools + 22 kinetic type modes.
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

### FASE 7 — Cavalry-Level Polish (elevar qualidade dos 22 modos existentes)

O objetivo é fazer cada modo do Tipó ter a fluidez e profissionalismo do Cavalry.
Atacar ANTES de criar ferramentas novas — polir o que existe primeiro.

#### 7.1 — Easing Curves profissionais em todos os modos
- Substituir interpolação linear/sin por curvas profissionais
- Biblioteca de easing: easeInOut, elastic, bounce, back, expo, circ
- Implementar em shared/ui.js como `TipoUI.ease(t, type)` reutilizável
- Aplicar em: Snap, Flash, Pow, Boost, Vessel (já tem parcial), Cascade, Morisawa
- Resultado: movimentos orgânicos em vez de mecânicos
- **Status:** [ ] A implementar

#### 7.2 — Mouse Interaction (elementos reagem ao cursor)
- mouseX/mouseY como variáveis de distorção no draw loop
- Modos prioritários: Field (letters repel/attract), Clutter (scatter follow mouse), Danger (distortion center = mouse), Pow (explosion origin = click)
- Implementar como opt-in toggle "Mouse React" em cada modo
- Mobile: touch position como substituto
- **Status:** [ ] A implementar

#### 7.3 — Noise orgânico em todas as animações
- Perlin noise sutil aplicado a posição, escala, rotação
- p5.js `noise()` nativo — adicionar como camada de "jitter" em todos os modos
- Slider "Organic" (0-100) que controla intensidade do noise
- Resultado: movimento humano, não robótico
- **Status:** [ ] A implementar

#### 7.4 — Transições suaves entre presets
- Ao trocar preset, animar os sliders de valor atual → valor novo (300ms ease)
- Em vez de snap instantâneo, morphing suave dos parâmetros
- Implementar em shared/ui.js como `TipoUI.animatePreset(values, duration)`
- Resultado: experiência premium, como trocar filtro no Instagram
- **Status:** [ ] A implementar

### FASE 8 — Novas Visual Tools (profissionais)

#### 8.1 — DEPTH (Image → 3D)
Upload imagem 2D → gera depth map → cria mesh 3D interativo.
- **Técnica:** Fragment shader com depth map displacement (Codrops approach)
- **Depth map:** AI via TensorFlow.js (DepthAnything/MiDaS) OU upload manual
- **Interação:** Mouse/touch parallax, gyroscope mobile, rotation
- **Controles:** Displacement strength, mesh resolution, rotation speed, zoom, lighting
- **Export:** PNG (screenshot 3D), MP4 (rotation loop), depth map PNG
- **Referências:**
  - Codrops fake 3D: `uv + mouse * depth.r` no fragment shader
  - Picto3D: three.js mesh com displacement map
  - TensorFlow.js Portrait Depth API
- **Stack:** three.js ou raw WebGL, nada de p5.js (performance)
- **Status:** [ ] A implementar

#### 8.2 — GRADIENT MAP
Upload imagem → mapeia luminosidade pra paleta de cores custom.
- **Diferente do Duotone (removido):** N cores, não 2. Gradiente completo.
- **Controles:** 5-10 color stops arrastáveis, curva de contraste, mix com original
- **Referência:** Gradient Map do Photoshop
- **Video+webcam input**
- **Status:** [ ] A implementar

#### 8.3 — PIXEL SORT
Upload imagem/video → pixel sorting artístico.
- **Técnica:** Ordena pixels por brightness/hue/saturation em faixas
- **Controles:** Direction (H/V/diagonal), threshold, sort by (brightness/hue/sat), range
- **Referência:** Kim Asendorf pixel sorting, glitch art community
- **Video+webcam input**
- **Status:** [ ] A implementar

#### 8.4 — COLOR HALFTONE (CMYK)
Imagem → separação CMYK com dots em ângulos diferentes por canal.
- **Técnica:** 4 passes (C/M/Y/K) cada um com halftone angle offset (15°/75°/0°/45°)
- **Controles:** Dot size, angles por canal, paper color, channel toggle
- **Referência:** Processo de impressão offset real
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

### Features Exclusivas do Tipó (ninguém mais tem)
1. **Visual Tools + Kinetic Type** na mesma plataforma
2. **Video + Webcam** como source em todas as ferramentas
3. **MP4 recording nativo** (sem ffmpeg, sem servidor)
4. **Overlay Generator** procedural seamless (substitui packs pagos)
5. **27 ferramentas** em HTML puro sem build tools

### Features que a concorrência tem e o Tipó não
1. Font engine vetorial (STG) → **Fase 9**
2. GIF export loop → **Fase 8.2**
3. Custom font upload → **Fase 8.1**
4. Mouse interaction → **Fase 8.3**
5. Share via URL → **Fase 8.4**
6. Image → 3D depth mesh → **Fase 7.1**

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
