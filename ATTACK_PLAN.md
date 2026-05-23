# Tipó — Plano de Ataque

## Visao Geral
28 ferramentas no total: 6 visual tools + 22 kinetic type modes.
Cada uma como pagina HTML independente, com shared CSS/JS.
Landing page (index.html) como hub central.

## Ordem de Implementacao

### FASE 0 — Infraestrutura ✅
- [x] Criar `shared/style.css` — design system (#99E0D2, swap btn, color-section-row)
- [x] Criar `shared/recorder.js` — classe TipoRecorder (MP4 + WebM fallback)
- [x] Criar `shared/ui.js` — TipoUI: sliders, presets, export, recorder, formatters
- [x] Criar `index.html` — landing page com navegacao progressiva + hash routing
- [ ] Migrar `dithering.html` pra usar shared CSS/JS
- [x] Setup Git repo (github.com/damelchert/tipo)
- [x] Deploy Vercel (auto-deploy on push)

### FASE 1 — Modos Core (p5.js) ✅
- [x] **CYLINDER** — 21 controles, 8 presets + Reset, p5.js WEBGL, fill() text rendering
- [x] **FIELD** — 21 controles, 7 presets + Reset, p5.js WEBGL, Z-surface auto-rotation
- [x] **STRIPES** — 13 controles + 5 colors, 11 presets + Reset, p5.js 2D, ribbon shadows
- [x] **COIL** — 13 controles + 5 colors, 11 presets + Reset, p5.js 2D, Archimedean spiral

### FASE 2 — Modos 3D Intermediarios
- [x] **FLAG** — 17 sliders, 14 presets (A Banner, A Twist, Folds, Flat Sea, Barber, Silos, Mystery, Cola Waves, Origami, Origami 2, B&W, Newsprint, Edge Case, Pride)
- [x] **CASCADE** — 8 sliders, 12 presets (Checker, Cascade, Classic, Mosaic, Ticker, Run, Salmon, Grid, Web Art, Sparkle, Pixel Gradient, Pride)
- [x] **RIBBON** — 15 sliders, 13 presets (Basic, Streamers, Terrace, Link, Sea, River, Web Art, Primary, Snake, Hot/Cold, Track, Track II, Pride)
- [x] **MORISAWA** — 6 sliders, 8 presets (Moon, Post Space, X, Bridge, Whitney, Beach, Recede, Pride)

### BACKLOG — Refinamento Fase 2
- [ ] **FLAG** — Implementar font engine vetorial completo (keyboardEngine_corners) para match exato com Space Type
- [ ] **CASCADE** — Refinamento parcial em 2026-05-23: Weight funcional, texto preservado, presets smoke-tested; ainda falta match visual fino com original
- [x] **RIBBON** — Testado scroll/multi-ribbon; texto agora repete internamente, Weight funciona, B-side/Text separado, geometria centralizada como STG
- [ ] **MORISAWA** — Refinamento parcial em 2026-05-23: Weight funcional, texto preservado, presets smoke-tested; ainda falta ajuste fino de flux/wrap/tracking

### FASE 3 — Modos 2D
- [x] **LAYERS** — 5 sliders, 7 presets (Speed Racer, To Space, Lost Time, Dot Spiral, Be Aggressive, Meat Space, Pride)
- [x] **DANGER** — 7 sliders, 8 presets (All Yours, Just OK, Not So Good, Cheer, Date, Hopes, Circle, Pride)
- [x] **STRING** — 5 sliders, 8 presets (Vote, Dream-ager, Tracks, Juicy, Guts, Spiral, Wave, Pride)

### FASE 4 — Modos Composicao (jQuery UI)
- [x] **BADGE** — Simplified: strip, ring, tunnel, spread layers. 15 controls, 9 presets
- [x] **CLUTTER** — 6 sub-modes (ring, cloud, cosmic, sphere, scatter, vortex). 5 controls, 7 presets
- [x] **CONSTRUCT** — 6 sub-modes (cloud, scribble, zigzag, gradient, box, matrix). 5 controls, 7 presets

### FASE 5 — Modos Animacao Avancada
- [x] **SNAP** — Kinetic letter stagger animation, 4 presets
- [x] **FLASH** — 8 cycling text effects (scale, shear, rotate, split, slide, fade, zoom), 5 presets
- [x] **POW** — Explosive particle text, radial scatter + reassemble, 5 presets
- [x] **CRASH** — Physics falling text with p5.js vectors, bounce/gravity, 5 presets
- [x] **CRASH CLOCK** — Real-time clock + high-end particle display, circular physics, clock hand collisions, 6 presets
- [x] **VESSEL** — Morphing container with 7 easing types, 5 presets
- [x] **SHINE** — Radial light spokes from text center (WEBGL), 5 presets
- [x] **BOOST** — Letter-by-letter directional reveal with overshoot, 5 presets

### FASE 6 — Polish & Deploy
- [x] Responsividade basica (mobile panel toggle via CSS media query)
- [x] Favicon + meta tags (SVG favicon + description + theme-color em todas as 24 paginas)
- [x] README.md publico
- [ ] Dominio custom (tipo.tools ou tipo.app) — acao do Daniel

### VISUAL TOOLS ✅
- [x] **DITHERING** — SVG dithering, 7-state luminance, 60+ shapes, MP4/PNG/SVG export
- [x] **RETÍCULA** — Halftone grid, 5 shapes (circle/square/diamond/cross/line), 6 presets
- [x] **GLITCH** — RGB shift, slicing, noise, scanlines, 6 presets, animated MP4
- [x] **DUOTONE** — 2-color mapping (shadow+highlight), 5 presets
- [x] **GRAIN** — Film grain overlay, density/size/opacity, 5 presets
- [x] **ASCII** — Image to ASCII art, 3 charsets, 5 presets

### BACKLOG — Pontas Soltas
- [ ] Migrar `dithering.html` pra usar shared CSS/JS (funcional mas isolado)
- [ ] Landing page: mini-previews animados por modo individual nos cards
- [ ] Dominio custom (tipo.tools ou tipo.app) — acao do Daniel
- [ ] Refinamento Fase 2 (FLAG font engine, CASCADE/RIBBON/MORISAWA ajustes visuais)
- [ ] Refinamento Fases 3-5 (ajustes visuais para match com Space Type Generator)

## Padrao de UI (aplicar em TODAS as paginas novas)
- Section titles em #99E0D2
- Presets logo abaixo do campo Text
- Botao Reset vermelho no final dos presets
- Color pickers + Swap button apos presets
- Header: NomeDoModo + KINETIC TYPE (esq) | HOME (dir)
- Dithering: VISUAL TOOLS (esq) | HOME (dir)
- Texto default: TIPÓ (nunca sobrescrever nos presets)
- MP4 recording + PNG export
- p5.js WEBGL pra 3D, p5.js 2D pra modos planos

## Referencias
- Space Type Generator source: `tipo_vault/knowledge/spacetype_src/`
- Eng reversa completa: `tipo_vault/knowledge/spacetype_reverse_engineering.md`
- Dithering refs: `tipo_vault/knowledge/screeshots/` e `screenshots 2/`
