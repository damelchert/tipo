# Tipó — Memória (Changelog)

---

## 2026-05-20

### Naming & Branding
- Nome definido: **Tipó**
- Brand squad consultado — 40+ sugestões avaliadas (EN e PT-BR)
- Decisão: nome em português, curto, universal, com personalidade brasileira

### Engenharia Reversa — Space Type Generator (COMPLETA)
- Site analisado: spacetypegenerator.com
- 22 modos mapeados com todos os parâmetros e presets
- 98 arquivos baixados (75 JS + 22 HTML + 1 CSS = ~1MB)
- 3 versões do keyboardEngine (font engine procedural)
- Stack identificada: p5.js + jQuery UI + CCapture.js + h264-mp4-encoder
- ~150 presets totais mapeados
- 25+ fontes identificadas
- Documentação salva em `tipo_vault/knowledge/spacetype_reverse_engineering.md`
- Source code salvo em `tipo_vault/knowledge/spacetype_src/`

### Organização do Projeto
- Pasta renomeada: `dithering tool` → `tipo`
- Vault renomeado: `dithering_vault` → `tipo_vault`
- Arquivo principal: `dithering-tool.html` → `dithering.html`
- Criados: `PROJECT_MEMORY.md`, `ATTACK_PLAN.md`, `projeto.md`, `memoria.md`
- Plano de ataque definido em 6 fases (23 ferramentas total)

---

## 2026-05-19

### Dithering Tool — Construção Completa
- Ferramenta criada do zero como single HTML file
- Análise de 23 screenshots do vídeo 1 do @antoncreations
- Análise de 9 screenshots do vídeo 2

### Features implementadas (em ordem cronológica)

**Core:**
- Upload de imagem/vídeo + webcam
- Grid de SVGs substituindo pixels baseado em luminosidade
- 7-State Midtone Mapping (highlights → shadows)
- Upload de SVG customizado por state
- Grid resolution, overall scale, aspect ratio (original/1:1)
- Background color picker
- Fill SVG shapes (solid) toggle
- Quick invert mapping
- Scale shapes with midtones (min/max)
- 90-degree snap rotation com interval
- Export PNG e SVG
- Drag & drop de arquivos

**Gravação de Vídeo:**
- v1: MediaRecorder WebM (funcionava mas formato ruim)
- v2: WebCodecs + mp4-muxer (MP4 direto, mas travava o vídeo)
- v3: MediaRecorder + conversão pós-gravação (lento, Infinity duration bug)
- v4 (FINAL): Gravação MP4 em tempo real com back-pressure control
  - `encodeQueueSize > 10` = skip frame
  - Real-time timestamps (performance.now) = velocidade constante
  - RecordCanvas fixo = dimensões consistentes mesmo mudando grid
  - Progress bar real no finalize
  - Timer de gravação visual (● REC 00:15)
- Seletor de qualidade: 8 Mbps (Standard) / 16 Mbps (High Quality)
- Removido 30 Mbps (muito pesado pro browser)

**Conversão WebM existente:**
- ffmpeg-static instalado via npm (brew não disponível)
- WebM 77MB → MP4 12MB (CRF 18) e MP4 35MB (lossless CRF 0)

**Shape Library:**
- 60+ shapes built-in em 7 categorias:
  - Geometric (16): circles, squares, diamonds, triangles, hexagons
  - Bars & Lines (11): barras H/V em 4 espessuras, stripes, grid
  - Crosses & Stars (8): cross, X, stars, asterisk, sparkle
  - Organic (8): blob, leaf, drop, heart, moon, spiral, wave
  - Arrows & Symbols (9): arrows, chevrons, eye, lightning
  - Fun & Icons (16): smiley, skull, ghost, alien, cat, chicken leg, pizza, crown, flame, mushroom, paw, music note, cactus, bomb
  - Halftone (9): dot patterns, checker, corners, semicircle
- Modal com grid visual clicável
- Botão de browse por state (engrenagem)
- 10 shape presets de 1 clique
- Randomize All 7 States

**Text → Shape:**
- v1: SVG com `<text>` element (não renderizava como Image)
- v2 (FINAL): Bitmap trace — rasteriza no canvas, lê pixels, gera SVG com mini-rects
- 6 fontes + 4 pesos (regular, bold, black, light)
- Assign first 7 chars to all states (cicla se < 7 chars)

**Color Palettes:**
- 24 paletas prontas (Grayscale, Neon, Sunset, Ocean, Retro, Vaporwave, Matrix, etc.)
- Cada paleta seta 7 cores dos states + background
- Preview visual com mini dots
- Hex color copiável em cada state (click to copy)

### Problemas resolvidos
1. **CDN bloqueado em file://** — ESM import não funciona, mudado pra UMD script tag
2. **Vídeo travava durante gravação** — VideoEncoder no render loop causava back-pressure
3. **Vídeo acelerava ao mexer grid resolution** — Canvas mudava de tamanho, timestamps baseados em frameCount. Fix: real-time timestamps + recordCanvas fixo
4. **Text SVG não renderizava** — `<text>` em SVG como Image não carrega fontes. Fix: bitmap trace
5. **WebM sem duração** — MediaRecorder não seta duration no header. Fix: gravar direto em MP4

---

## Decisões Técnicas Importantes

| Decisão | Por quê |
|---------|---------|
| HTML puro sem build tools | Simplicidade, zero setup, deploy direto |
| mp4-muxer UMD via CDN | Funciona sem npm/webpack, carrega sync |
| Back-pressure via encodeQueueSize | Evita travar render loop |
| Real-time timestamps | Velocidade constante independente de performance |
| RecordCanvas separado | Dimensões fixas durante gravação |
| Bitmap trace pra text | Fontes não carregam em SVG-as-Image |
| Baseline H.264 profile | Encoding mais rápido que High profile |
| latencyMode: 'realtime' | Flush quase instantâneo |
