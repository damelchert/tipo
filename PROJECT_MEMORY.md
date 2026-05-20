# Project Memory — Tipó
**Last updated:** 2026-05-20

## Projeto
**Tipó** — Suite de ferramentas visuais generativas para motion type, kinetic typography e dithering.
Inspiracao: @antoncreations (Instagram) + Space Type Generator (kielm).

## Nome
**Tipó** (com acento) — "tipo" em português com personalidade brasileira. Universal, curto, memorável.
Dominios a verificar: tipo.tools, tipo.studio, tipo.design, tipo.app

## Status Atual

### Dithering Tool (`dithering.html`) — FUNCIONAL
- Single HTML file, roda no Chrome via localhost
- Substitui pixels por SVGs baseado em luminosidade (7 states)
- Upload imagem/video + webcam
- 7-State Midtone Mapping com upload de SVG customizado
- Shape Library: 60+ shapes built-in (geometric, bars, crosses, organic, fun/icons, halftone)
- Text-to-Shape: converte caracteres em shapes (bitmap trace)
- 10 shape presets + 24 color palettes
- Export: PNG, SVG, MP4 (8/16 Mbps)
- Recording com timer visual e progress bar

### Space Type Generator — ENGENHARIA REVERSA COMPLETA
- 22 modos mapeados, 98 arquivos fonte baixados
- Salvo em: `tipo_vault/knowledge/spacetype_src/`
- Documentacao: `tipo_vault/knowledge/spacetype_reverse_engineering.md`
- Stack: p5.js + jQuery UI + h264-mp4-encoder
- Pendente: implementacao

## Decisoes Tecnicas
- Multi-page static site (cada modo = 1 pagina)
- Shared: CSS, recorder, UI components
- MP4 recording: WebCodecs + mp4-muxer
- p5.js para kinetic type modes
- Deploy: GitHub Pages ou Netlify (static)
- Servido local via `npx http-server` em localhost:8080

## Estrutura de Arquivos
```
/tipo/
  index.html                   — landing page / menu
  dithering.html               — SVG dithering tool
  cylinder.html                — kinetic type: cylinder
  field.html                   — kinetic type: field
  stripes.html                 — kinetic type: stripes
  ... (22 modos)
  shared/
    style.css                  — dark theme compartilhado
    recorder.js                — sistema de gravacao MP4
    ui.js                      — sliders, panels, color pickers
    palettes.js                — color palettes
  assets/
    fonts/                     — fontes .otf/.woff2
  tipo_vault/
    knowledge/
      screeshots/              — refs @antoncreations
      screenshots 2/           — refs video 2
      spacetype_src/           — 98 arquivos fonte (eng reversa)
      spacetype_reverse_engineering.md
    outputs/                   — exports de teste
  PROJECT_MEMORY.md            — este arquivo
  ATTACK_PLAN.md               — plano de ataque
```
