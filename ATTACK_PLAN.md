# Tipó — Plano de Ataque

## Visao Geral
23 ferramentas no total: 1 dithering + 22 kinetic type modes.
Cada uma como pagina HTML independente, com shared CSS/JS.
Landing page (index.html) como hub central.

## Ordem de Implementacao

### FASE 0 — Infraestrutura (PRIMEIRO)
- [x] Criar `shared/style.css` — dark theme unificado (design system completo)
- [x] Criar `shared/recorder.js` — sistema de gravacao MP4 reutilizavel (classe TipoRecorder)
- [ ] Criar `shared/ui.js` — sliders, panels, dropdowns compartilhados
- [x] Criar `index.html` — landing page com grid de todos os 23 modos
- [ ] Migrar `dithering.html` pra usar shared CSS/JS
- [ ] Setup Git repo

### FASE 1 — Modos Simples (3D basico, p5.js WEBGL)
Estes usam a mesma base: p5.js WEBGL + keyboardEngine

- [ ] **CYLINDER** — 21 sliders, 7 presets (Simple, Jellyfish, Crown, Complex, Weave, Zebra, Hoops)
- [ ] **FIELD** — 21 sliders, 6 presets (Stacks, Bricks, Simple Z, Complex Z, Zebra, Harlequin)  
- [ ] **COIL** — 13 sliders, 11 presets (Wide, Super, Amoeba, Spacer, Kitty, Hourglass, Star, ZZtar, Pretzel, Lemniscate)
- [ ] **STRIPES** — 13 sliders, 10 presets (Marquee, Subway, Wow, Stacks, Old Sea, Color Sea, Simple Wave, Simple Wave 2, Not So Weird, Racer)

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
- [ ] Git push
- [ ] Deploy (GitHub Pages ou Netlify)
- [ ] README.md publico

## Shared Features (todas as paginas)
- Dark UI theme
- Text input field
- Color pickers (type color + background)
- Preset buttons
- PRIDE mode (rainbow colors)
- MP4 recording + export
- PNG screenshot
- Mode selector dropdown (navega entre modos)
- Full screen toggle

## Estimativa
- Fase 0: fundacao
- Fase 1: 4 modos core
- Fase 2: 4 modos intermediarios
- Fase 3: 3 modos 2D
- Fase 4: 3 modos composicao
- Fase 5: 8 modos avancados
- Fase 6: polish + deploy

## Referencias
- Space Type Generator source: `tipo_vault/knowledge/spacetype_src/`
- Eng reversa completa: `tipo_vault/knowledge/spacetype_reverse_engineering.md`
- Dithering refs: `tipo_vault/knowledge/screeshots/` e `screenshots 2/`
