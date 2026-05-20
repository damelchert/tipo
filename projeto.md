# Tipó — Projeto

## O que é
Suite de ferramentas visuais generativas para motion type, kinetic typography e dithering. Roda 100% no browser, sem backend, sem instalação.

## Pra quem
- Designers gráficos
- Motion designers
- Artistas visuais
- Criativos que fazem posters, social media, video content
- Tipógrafos experimentais

## O que faz

### Dithering Tool
Transforma imagens e vídeos em arte visual usando SVGs customizados no lugar de pixels. Cada pixel é substituído por um shape (círculo, quadrado, letra, emoji, forma orgânica) baseado na luminosidade. 7 níveis de shadow-to-highlight, cada um com shape e cor independente.

### Kinetic Type (22 modos)
Tipografia animada/cinética em tempo real. Digita texto e vê ele se transformar em:
- **Formas 3D:** Cylinder, Coil, Ribbon, Flag
- **Campos:** Field, Stripes, Cascade, Layers
- **Composições:** Badge, Clutter, Construct
- **Animações:** Snap, Flash (18 sub-modos), Pow, Crash
- **Efeitos:** Shine, Boost, Vessel, String, Danger
- **Especiais:** Morisawa, Crash Clock

Cada modo tem controles (sliders, color pickers) e presets prontos.

### Export
- PNG (screenshot)
- SVG (vetorial)
- MP4 (gravação de vídeo direto no browser, 8 ou 16 Mbps)

## Stack Técnica
- HTML/CSS/JS puro (sem frameworks, sem build tools)
- p5.js (WEBGL) para modos de kinetic type 3D
- Canvas 2D para dithering
- WebCodecs + mp4-muxer para gravação MP4
- Static site — deploy no GitHub Pages ou Netlify

## Arquitetura
Multi-page static site:
- `index.html` — landing page / hub central
- `dithering.html` — ferramenta de dithering
- `cylinder.html`, `field.html`, etc. — cada modo em sua página
- `shared/` — CSS, JS de recording, UI components compartilhados
- `assets/fonts/` — fontes tipográficas

## Inspirações
- @antoncreations (Instagram) — dithering com SVGs customizados
- Space Type Generator (kielm.com) — kinetic typography

## Diferencial
- Tudo no browser, zero instalação
- Gravação MP4 nativa (sem ffmpeg, sem servidor)
- Dark UI com vibe de instrumento musical/creative tool
- Shape library com 60+ formas built-in
- 24 paletas de cores prontas
- Text-to-shape (qualquer letra vira textura de dithering)
- Identidade brasileira no nome e na atitude
