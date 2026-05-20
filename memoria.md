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
  index.html                   — landing page (navegação progressiva)
  dithering.html               — SVG dithering tool (FUNCIONAL)
  cylinder.html                — kinetic type: cylinder (FUNCIONAL)
  shared/
    style.css                  — design system (CSS variables, dark theme)
    recorder.js                — classe TipoRecorder (MP4 recording)
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
  memoria.md                   — este arquivo
  ATTACK_PLAN.md               — plano fase-a-fase
  .gitignore                   — exclui node_modules, vault, squads
```

## Decisões Técnicas

| Decisão | Por quê |
|---------|---------|
| HTML puro sem build tools | Simplicidade, zero setup, deploy direto |
| Multi-page static site | Cada modo independente, performance, fácil manter |
| p5.js WEBGL pra kinetic type | 3D nativo no browser, mesmo que o original |
| mp4-muxer UMD via CDN | Funciona sem npm/webpack, carrega sync |
| Back-pressure via encodeQueueSize | Evita travar render loop |
| Real-time timestamps | Velocidade constante independente de performance |
| RecordCanvas separado | Dimensões fixas durante gravação |
| Bitmap trace pra text-to-shape | Fontes não carregam em SVG-as-Image |
| Baseline H.264 + latencyMode realtime | Encoding rápido, flush instantâneo |
| fill() em vez de stroke() no WEBGL | p5.js text() em WEBGL renderiza como geometria preenchida |
| .ttf em vez de .otf/.woff2 pra p5.js | loadFont() precisa de TTF ou OTF real (não WOFF) |

---

## 2026-05-20

### Cylinder — Primeiro Kinetic Type Mode (FUNCIONAL)
- 21 controles: Cylinder (radius, count, rotate, offset), Wave (count, speed, latitude, longitude, ripple, x/y scale), Type (x/y scale, weight), Tweak (x/y/z rotation), Camera (x/y/z rotation, zoom)
- 8 presets: Simple, Jellyfish, Crown, Complex, Weave, Zebra, Hoops, Pride
- MP4 recording via TipoRecorder compartilhado
- PNG export via p5.js saveCanvas
- Dark UI Tipó com shared CSS
- **Bug fix:** fonte .otf baixou como HTML (GitHub redirect). Resolvido baixando .ttf do Google Fonts GitHub
- **Bug fix:** text() em WEBGL precisa de fill() não stroke(). Mudado de noFill()+stroke() pra fill()+noStroke()

### Infraestrutura & Deploy
- Git repo criado: github.com/damelchert/tipo
- Deploy Vercel configurado (auto-deploy on push)
- shared/style.css — design system completo (CSS variables, panels, buttons, sliders, modals, cards, landing)
- shared/recorder.js — classe TipoRecorder reutilizável (MP4 + WebM fallback, back-pressure, progress)
- Landing page com navegação progressiva: Home → Visual Tools / Kinetic Type → subcategorias → modos

### Naming & Branding
- Nome definido: **Tipó**
- Brand squad consultado — 40+ sugestões em EN e PT-BR
- Decisão: nome em português, curto, universal

### Engenharia Reversa — Space Type Generator (COMPLETA)
- 22 modos mapeados com todos os parâmetros e presets (~150 presets totais)
- 98 arquivos baixados (75 JS + 22 HTML + 1 CSS = ~1MB)
- 3 versões do keyboardEngine (font engine procedural)
- Stack: p5.js + jQuery UI + CCapture.js + h264-mp4-encoder
- 25+ fontes identificadas
- Docs em `tipo_vault/knowledge/spacetype_reverse_engineering.md`

### Organização
- Pasta renomeada: `dithering tool` → `tipo`
- Vault renomeado: `dithering_vault` → `tipo_vault`

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
- Shape Library: 60+ shapes em 7 categorias (geometric, bars, crosses, organic, arrows, fun/icons, halftone)
- Text-to-Shape: bitmap trace (rasteriza → lê pixels → SVG com mini-rects)
- 10 shape presets + 24 color palettes
- Hex color copiável (click to copy)
- Export: PNG, SVG, MP4 (8/16 Mbps)

**Gravação de Vídeo (4 iterações):**
- v1: MediaRecorder WebM → formato ruim
- v2: WebCodecs direto → travava vídeo
- v3: Record + convert → lento (Infinity duration bug)
- v4 (FINAL): MP4 em tempo real, back-pressure control, real-time timestamps, recordCanvas fixo, progress bar, timer visual

**Problemas resolvidos:**
1. CDN bloqueado em file:// → UMD script tag
2. Vídeo travava → back-pressure via encodeQueueSize
3. Vídeo acelerava → real-time timestamps + recordCanvas fixo
4. Text SVG não renderizava → bitmap trace
5. WebM sem duração → gravar direto em MP4
