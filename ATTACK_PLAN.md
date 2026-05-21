# Tipó — Plano de Ataque

## Visao Geral
23 ferramentas no total: 1 dithering + 22 kinetic type modes.
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
- [ ] **CASCADE** — Testar todos os presets, ajustar visual para match com original
- [ ] **RIBBON** — Testar scroll e multi-ribbon, ajustar posicionamento de texto
- [ ] **MORISAWA** — Testar flux mode e wrap-around, ajustar tracking

### FASE 3 — Modos 2D
- [x] **LAYERS** — 5 sliders, 7 presets (Speed Racer, To Space, Lost Time, Dot Spiral, Be Aggressive, Meat Space, Pride)
- [x] **DANGER** — 7 sliders, 8 presets (All Yours, Just OK, Not So Good, Cheer, Date, Hopes, Circle, Pride)
- [x] **STRING** — 5 sliders, 8 presets (Vote, Dream-ager, Tracks, Juicy, Guts, Spiral, Wave, Pride)

### FASE 4 — Modos Composicao (jQuery UI)
- [x] **BADGE** — Simplified: strip, ring, tunnel, spread layers. 15 controls, 9 presets
- [x] **CLUTTER** — 6 sub-modes (ring, cloud, cosmic, sphere, scatter, vortex). 5 controls, 7 presets
- [x] **CONSTRUCT** — 6 sub-modes (cloud, scribble, zigzag, gradient, box, matrix). 5 controls, 7 presets

### FASE 5 — Modos Animacao Avancada
- [ ] **SNAP** — kineticLetter/Word/Group classes
- [ ] **FLASH** — 18 sub-animacoes! (riseSun, cloud, arcer, snap, split, bend, shutters, slotMachine, bugEyes, twist, halo, grid, starburst, box, blank)
- [ ] **POW** — Explosao, mouse interaction, 4 classes
- [ ] **CRASH** — Physics, collision, debris, 7 classes
- [ ] **CRASH CLOCK** — Relogio + crash, particles
- [ ] **VESSEL** — Easing curves (Sine, Cubic, Circ, Expo, Back, Bounce, Elastic)
- [ ] **SHINE** — Spoke class, easing curves
- [ ] **BOOST** — Suporte arabe, tumble/zoom animations

### FASE 6 — Polish & Deploy
- [ ] Responsividade basica
- [ ] Favicon + meta tags
- [ ] README.md publico
- [ ] Dominio custom (tipo.tools ou tipo.app)

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
