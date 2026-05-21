# Tipó — Plano de Ataque

## Visao Geral
23 ferramentas no total: 1 dithering + 22 kinetic type modes.
Cada uma como pagina HTML independente, com shared CSS/JS.
Landing page (index.html) como hub central.

## Ordem de Implementacao

### FASE 0 — Infraestrutura ✅
- [x] Criar `shared/style.css` — design system (#99E0D2, swap btn, color-section-row)
- [x] Criar `shared/recorder.js` — classe TipoRecorder (MP4 + WebM fallback)
- [ ] Criar `shared/ui.js` — sliders, panels, dropdowns compartilhados
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
- [ ] **FLAG** — 17 sliders, 13 presets (A Banner, A Twist, Folds, Flat Sea, Barber, Silos, Mystery, Cola Waves, Origami, Origami 2, B&W, Newsprint, Edge Case)
- [ ] **CASCADE** — 8 sliders, 11 presets (Checker, Cascade, Classic, Mosaic, Ticker, Run, Salmon, Grid, Web Art, Sparkle, Pixel Gradient)
- [ ] **RIBBON** — 15 sliders, 12 presets (Basic, Streamers, Terrace, Link, Sea, River, Web Art, Primary, Snake, Hot/Cold, Track, Track II)
- [ ] **MORISAWA** — 6 sliders, 9 presets (MOON, Post Space, X, Bridge, Whitney, Beach, Recede, Flux Loop, Scroll)

### FASE 3 — Modos 2D
- [ ] **LAYERS** — 5 sliders, 7 presets (Speed Racer, To Space, Lost Time, Dot Spiral, Be Aggressive, Meat Space)
- [ ] **DANGER** — 7 sliders, 7 presets (All Yours, Just OK, Not So Good, Cheer, Date, Hopes, Circle)
- [ ] **STRING** — 2 sliders + particles, 7 presets (Vote, Dream-ager, Tracks, Juicy, Yes &, Guts, Eels & wind)

### FASE 4 — Modos Composicao (jQuery UI)
- [ ] **BADGE** — 41 sliders, 11 font presets
- [ ] **CLUTTER** — jQuery UI, sub-modes (ring, cloud, cosmic, sphere, grfx)
- [ ] **CONSTRUCT** — jQuery UI, sub-modes (cloud, scribble, zigzag, gradient, box)

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
