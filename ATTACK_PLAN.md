# Tipó — Plano de Ataque

## Visao Geral
38 ferramentas ativas: 15 visual tools + 23 kinetic type modes. (Gradient Shaper removido a pedido do Daniel em 11/07.)
Cada uma como pagina HTML independente, com shared CSS/JS.
Landing page (index.html) como hub central.
Deploy: Vercel (auto-deploy on push).

## Status por Fase

### FASE 22 — SKETCH-CLASS: áudio-reatividade + Tipó Studio (referência: eng. reversa do tools.sketchdesign.club, doc no vault `sketchtools_reverse_engineering.md`, pedido do Daniel 21/07: "canvas em nodes, mudar ou implementar algo assim, especialmente visual tools")
- **22.1 TipoAudio — áudio como fonte do TipoBehavior** ✅ (2026-07-21): 2 AnalyserNodes (FFT2048 smoothing .8 = level+bandas bass/mid/treble com blend média+pico e knee anti-sidelobe; FFT2048 smoothing 0 = spectral flux → kick 60-100Hz/snare 180-260+2.5-3.5k/hihat 10-16k com envelope de release). 7 tipos ♪ no popover do "~" (Speed vira Sens.), botão ♪ flutuante (bottom 64px right 62px, ao lado do ⏱) com popover de fonte (arquivo em loop audível / mic sem eco / desligar) + VU meter. TODAS as ~39 ferramentas ganharam sem tocar em nenhuma (contrato de input sintético). test-audio.mjs 13/13.
- **22.2 Tipó Studio** ✅ v1 (2026-07-21): studio.html (ferramenta #40, 17ª visual) — chain WebGL2 ping-pong (2 framebuffers, cada efeito = fragment shader lendo uTex do anterior, 1 rAF síncrono on-demand, blit final em canvas 2D visível pro recorder/PNG padrão). 8 efeitos shader: Halftone (ink source/preto/teal sobre cream), Dither Bayer 4×4, Pixelate, Gradient Map 4 stops (Athos default), Posterize, Glitch (rgb shift+slices+scanlines), Wave, Film Grain (+vignette). Stack de cards (▲▼ reordena, dot bypassa, × remove, máx 8); params em .range-row → TipoBehavior/TipoAudio DE GRAÇA (panes ficam todos no DOM, display:none nos não-selecionados, pra behaviors não morrerem ao trocar de card). Fontes: demo animado brand/imagem/vídeo/webcam/drag&drop. 6 presets de receita (Riso default, Print, VHS, Poster, Zine, Dream). test-studio.mjs 20/20. Backlog v2: composição generativa (chroma-key entre nodes), quality tiers, error-diffusion/pixel-sort como pass CPU, canvas infinito.
- **22.2 v2/v3** ✅ (2026-07-21/22): UI reescrita como O ESPAÇO (canvas infinito com grade de pontos que escala com o zoom, pan/zoom/pinça, nodes como cards no mundo com fio SVG, inspector flutuante, modal Tools) + **MULTI-FRAME**: várias mídias simultâneas, cada frame com fonte/stack/dock próprios, arrastável, drop cria frame ou troca fonte, dock/export seguem o ativo. test-studio 34/34.
- **22.3 (a–h) ✅ COMPLETA** (2026-07-21/22) — o sprint que consolidou o Studio:
  - a) 8→14 efeitos + controles fundos; b) chrome por frame (● REC no frame certo + bug do recorder preso no 1º canvas, ⧉ dup, rename inline, Delete no teclado, label tamanho-constante); c) **áudio dentro do MP4** (site-wide, AAC via tap do TipoAudio); d) +22 controles ("mais modulável"); e) **persistência do espaço** (IndexedDB, auto-save, botão Novo); f) Liquid Flow (Tiny Planet entrou e SAIU — "muito meme"); g) **Droste + Fractal Julia** (orbit trap de imagem); h) engine com **FEEDBACK** (textura persistente por node) → **Mosh + Echo Trails**. 19 efeitos, test-studio ~55 checks + test-studio-persist 12/12 + test-rec-audio 10/10.
- **Também fechado nesse ciclo**: travada inicial de TODAS as gravações morta (warmup do encoder, test-rec-start 34ms máx), exports padronizados `tipo-<tool>-AAAA-MM-DD_HH-MM-SS.ext`, HERO v2.1 "Revelação Líquida" (liquid da tela toda → TIPÓ em Clash, ~2.3s, só scroll) e home em 3 painéis (STUDIO | Visual | Kinetic).

### ⏭ PRÓXIMAS ETAPAS (fila acordada com o Daniel — retomar daqui)
1. **22.4 Source TEXTO no Studio** ✅ (2026-07-22): fonte 'text' por frame — 4 motions (wave/scroll marquee/pulse/parado), cores brand ciclando por letra, fontes da casa via FontFace lazy, Size/Speed ♪-moduláveis, pane pseudo-node no inspector, persistência completa. Provado: TIPÓ→Halftone, FLOW(Boska)→Mosh→GradMap.
2. **22.5 Blend node**: node que recebe DOIS frames e combina (multiply/screen/overlay/máscara de luminância/alpha) — o salto de stack pra GRAFO. UI: node aponta pra outro frame como segunda entrada (select de frame no inspector); engine já tem tudo (texturas por frame no mesmo contexto).
3. **22.6 Ponte de canvas p5** (só se o source Texto deixar gosto): rodar um modo kinetic (coil/field) offscreen como fonte de frame — qualquer canvas serve de texImage2D. Pesado; avaliar depois do 22.4.
4. **22.7 Slit-scan / Time Displacement** (agora VIÁVEL com a infra de feedback — history buffer por node) + candidatos: Voronoi shatter, Droste follow-ups.
5. **22.8 Sketch-class restante**: BPM phase-lock nos behaviors ♪; quality tiers no Studio (low/med/high); error-diffusion e pixel-sort como pass CPU opcional; Export HQ offline pro Studio (hoje grava live ≤1440).
6. **Home (opcional, Daniel deu "blz" mas registrado)**: trocar vídeo acinzentado do painel Kinetic por animação CSS de letras; glow escuro por painel no tom da paleta (teal/gold/mint).
7. **Backlog fora do Studio**: Fotograma 21.6 (idioma UI) + moodboards extras (noir/P&B/automotivo); Fase 20.2 (repaginada premium restante); 19.3/19.4 (deterrentes: ofuscação/watermark); PWA (adiado de propósito).

### FASE 21 — FOTOGRAMA: still cinematográfico com IA (pedido do Daniel 15/07) — ✅ v1 (2026-07-16)
Ferramenta #39, inspirada no Cinematic Studio (Marcos/HDLX) e denoised.ai, com a pegada Tipó: prompt simples → **motor de direção** → Nano Banana revela o still em linguagem de película.
- **System prompt**: evolução do v2.0 do vault `nano banana testing` (tags que o Nano reconhece, 1 por categoria, effects not specs, máx 420 chars) com **dois programas**: CINEMA (grain 35mm vivo, lifted blacks, naturalismo) e COMMERCIAL (grain ultra-fino, key light esculpida, energia de campanha) — cada um com persona, FIXED e universo de mood próprios.
- **12 enquadramentos** como chips (worm's eye, dutch, bird's eye, crane, knee-level, through glass, wide negativo…) + 🎲 surpreenda — frases CONCRETAS ("shot from directly below looking straight up"), aprendizado da bateria: frase abstrata o modelo suaviza. **9 film stocks** (Vision3 500T/250D/50D, CineStill 800T halation, Portra, Ektachrome, HP5/Delta3200 P&B, Polaroid) e **6 paletas narrativas** dos catálogos `_knowledge/fotografia`. Regra "no text/logos" default (a bateria mostrou o commercial inventando type de campanha).
- **Híbrido**: template determinístico (1 chamada) OU Diretor ✨ (Gemini Flash decupa em FG/MG/BG com o system prompt, mesma chave). Fallback: Diretor falhou → template.
- **BYO key blindada** (decisão do Daniel): Google AI Studio key colada pelo usuário, salva opcionalmente no localStorage, botão Esquecer, input mascarado; viaja SÓ pro Google **via header x-goog-api-key** (nunca em URL), erros sanitizados (corpo cru nunca ecoa na UI). CSP: connect-src ganhou generativelanguage.googleapis.com.
- **Modelos por descoberta**: ListModels da chave → Nano Banana Pro (default, com select de resolução 1K/2K/4K) e Nano Banana; fallback hardcoded. Escada de compatibilidade no payload (responseModalities/imageConfig variam por geração).
- **Validação**: bateria de 8 imagens reais via Higgsfield CLI (Nano Banana Pro unlimited) — 4 cenas × 2 programas com framings não-convencionais; look confirmado (halation CineStill, knee-level com criança na altura da lente, bird's eye com grid, campanha top-down). Demo still da bailarina embarcado (224KB). Smoke mockado 12/12.
#### 21.1 — v2: lentes reais, sugador de mood, refs, 3º programa (screenshots do Daniel 15/07) — ✅ (2026-07-16)
- ✅ **Lentes que FUNCIONAM** (o Cinematic falha porque manda NOME de lente — o vault confirmou em v0-v2 que o Nano ignora nomes): 12 lentes reais do catálogo (Cooke S4/i, Speed Panchro, Zeiss Super Speed/Master, Primo, K35, Helios swirl, Cooke/Kowa anamórficas, tilt-shift, macro) com a UI mostrando a lente REAL e o prompt carregando a **assinatura perceptual** ("swirly busy bokeh spinning", "oval bokeh + horizontal blue flare streaks"). **Validado com 3 gerações reais da mesma cena**: Helios × Anamórfica × Panchro saíram opticamente DISTINTAS (streaks azuis inconfundíveis na anamórfica 21:9).
- ✅ **Luz esculpida** 7→14 opções (Rembrandt, chiaroscuro, top light noir, fogo/vela, fluorescente fria, blue hour, silhueta) — sempre "light as weather", nunca setup.
- ✅ **3º programa CINE-COM** (denoised tem CINEMATIC/COMERCIAL/CINEMATIC COMERCIAL): campanha com alma de filme — hero clarity + patina no mundo ao redor.
- ✅ **SUGADOR DE MOOD 🧃** (a melhor feature do Cinematic, segundo o Daniel): sobe imagem de estilo → **arrasta uma região** no canvas pra sugar só ela (crop client-side) → Gemini vision descreve APENAS o físico transferível (pigmentos nomeados, caráter da luz, grain/halation/blacks, 1 palavra de registro emocional — nunca objetos/composição) → a imagem VAI no payload + cláusula "transfer ONLY palette/grain/light/texture". Hint: Nano 2 suga melhor.
- ✅ **Referências de imagem** (até 4): downscale client-side 1024px JPEG, thumbs com remover, vão como inlineData antes do texto.
- ✅ Regra clean reforçada ("no film borders or frame edges" — a Panchro desenhou borda Kodak). Smokes 12/12 + 12/12.
#### 21.2 — Ajustes do teste real do Daniel (16/07) — ✅
- ✅ "Sugador de mood" remetia ao Cinematic → rebatizado **EMULSÃO** (a camada química da película que segura cor/grain/textura — exatamente o que a feature transfere; linguagem de laboratório da casa). Seção enxugada: só título + botão Referência + canvas; explicações viraram tooltip.
- ✅ Select de modelo com chave real listava variantes erradas → **whitelist estrita**: só Nano Banana Pro (pro-image) e Nano Banana 2 (flash-image, sem lite), canônico sem "preview" preferido. Testado contra modelos-ruído no mock.
#### 21.3 — Chave Agent Platform / Vertex (teste real do Daniel 16/07) — ✅
- Diagnóstico: a chave dele é da **Agent Platform (ex-Vertex, prefixo AQ.)** — endpoint aiplatform.googleapis.com, não o generativelanguage do AI Studio. Por isso NADA gerava (backend errado pra chave).
- ✅ **Dual-backend com detecção automática pelo prefixo**: AIza… → AI Studio (discovery de modelos via ListModels); AQ.… → Vertex express (`/v1/publishers/google/models/{id}:generateContent`, sem ListModels — valida com ping mínimo no flash e usa a dupla Nano fixa). Todos os call sites (Diretor, Emulsão, geração) passam pelo `callModel()` backend-aware; ids de modelo agora são puros (o backend monta o caminho).
- ✅ Fallback Pro→Nano 2 e safeDetail valem nos dois backends; máscara de chave cobre AQ. também; CSP ganhou aiplatform.googleapis.com; hint da chave explica os dois tipos. Smokes 4 suítes ALL PASS (vertex: zero chamadas pro backend errado, chave só no header).
#### 21.4 — IDs oficiais dos modelos (Daniel 16/07) — ✅
- Trio canônico usável nos DOIS backends: **gemini-3-pro-image** (Nano Banana Pro), **gemini-3.1-flash-image** (Nano Banana 2), **gemini-3.1-flash-lite-image** (Nano Banana 2 Lite — antes filtrado por engano, agora terceira opção). Descoberta no AI Studio prefere versão mais ALTA sem preview; fallback de cota virou CADEIA (Pro → 2 → 2 Lite). 4 suítes ALL PASS.
#### 21.5 — Auditoria input→imagem + TAGS.pdf + galeria/fila (Daniel 16/07) — ✅
- **Diagnóstico da geração ruim** (3 causas simultâneas): (1) prompt final VERBOSO (~700 chars de frases) contra a doutrina do TAGS.pdf ("1 tag por categoria, densidade vence quantidade"); (2) a escada de payload descartava o imageConfig INTEIRO quando o modelo recusava — aspect ratio ia junto (o "virou a imagem"); (3) fallback de cota podia gerar no Lite silenciosamente (adesão fraca sem o usuário saber).
- ✅ **Prompt no formato COMBO do TAGS.pdf**: cena + tags densas (framing concreto, luz-tag, lente nome+efeito, stock, grading, fixed compacto, mood) ≈450 chars. Luzes/lentes/programas reescritos com o vocabulário confirmado (Rembrandt lighting, Helios 44-2 swirly bokeh, lifted blacks milky shadows, commercial polish…).
- ✅ Escada preserva o AR até a penúltima tentativa e AVISA se cair pro default; legenda mostra o MODELO REAL que gerou + notas (fallback, config recusada).
- ✅ **Fila de revelação** (1 por vez, até 4 aguardando, botão mostra posição) e **galeria com ações** no hover: ♥ curtir, ⬇ baixar, ↺ reusar TODOS os parâmetros do take, ✕ excluir. Cap 12 takes em memória.
- ✅ Provas reais (Nano Banana Pro): padaria brasileira P&B worm's eye 100% aderente (pombas, caos, HP5 mono, placa e fiação BR) e noturna CineStill com halation viva nos practicals. Dutch reforçado ("camera rolled sideways") — é o framing mais teimoso do modelo.
#### 21.6 — Lapidação com testes reais do Daniel (16/07, ~10 commits) — ✅
- ✅ Hierarquia limpa: Cena → Emulsão/Refs (com drag & drop, abaixo do prompt) → ESTÉTICA (Cinema/Publicidade/Publicidade Cinemática) → níveis; LOOKS removido (puxava seletores); DNA dos 7 moodboards embutido nas estéticas como repertório do Diretor.
- ✅ Arbitragem "texto do usuário é lei" (cena com enquadramento/luz cala o seletor + toast); refs com cláusula de fidelidade de conteúdo (produto exato entra na cena — provado com o óculos hexagonal); Diretor traduz tudo pro EN e preserva a direção escrita.
- ✅ Segurança: prompt final fora da UI, anti-jailbreak na entrada + cláusula SECURITY no Diretor; chave sempre persistida até Esquecer (🔑 popover).
- ✅ UX: geração não-bloqueante (tile na galeria), fila ≤4, galeria 1/3 com ações grandes + lightbox + export tipo_fotograma_data-hora; galeria persistente em IndexedDB (fix Safari: ArrayBuffer, não Blob).
- **Estado consolidado na memoria.md (seção "FOTOGRAMA — ESTADO FINAL CONSOLIDADO").**
- [ ] 21.7 — idioma da UI (hoje PT — entra na decisão de voz única da 20.2)

### FASE 20 — REPAGINADA PREMIUM (auditoria de UI 13/07, lente de juiz Awwwards)
**Veredito da auditoria** (27 capturas: hero, home light/dark, catálogo, 14 ferramentas, timeline, mobile): Creativity 8.5 / Design 6.5 / Usability 7 / Content 8 — "produto premium vestindo partes de produtinho". Premium: hero, entradas curadas (riso/depth/morisawa/overlay), sistema do painel, palette. Produtinho: catálogo de cards genérico, dark mode quebrado (canvas cream + faixa exposta no field, cinzas divergentes na home), controles nativos do browser, header com nav ilegível, idioma misturado (hero PT × site EN × pílulas PT), pill "FREE" ambígua, dithering abre vazio + anatomia divergente, badge entry bagunçada.

#### 20.1 — Header + identidade da página (pedidos do Daniel 13/07) — ✅ (2026-07-13)
- ✅ **Header imprime em Clash Display** (era Plex 900 — descolava da marca): font do HeaderFX → ClashDisplay 600, rebuild em document.fonts.ready.
- ✅ **Subbar**: breadcrumb + stats saíram da faixa animada pra uma barra sólida de 36px logo abaixo da linha — legível nos 2 temas. "0 install" → "**zero install**".
- ✅ **Eyebrow de categoria nas ferramentas**: "Home / Kinetic Type / **3D**" (categoria em accent, maior) acima do título, alinhado com o h1; links minúsculos do h1 removidos (inclusive o span.nav-links do dithering, que usa #controlPanel). Mapa de categoria já existia (_backTargets).
- ✅ **Crédito**: subbar do index ("made by **Daniel Melchert**" → danielmelchert.com.br) + caption fixa discreta bottom-right nas 38 ferramentas (some no mobile/fullscreen). Preenche o rodapé vazio das páginas.
- Verificado: Clash carregada, subbar fora do header, eyebrow certo em field/riso/badge/dithering, zero pageerrors.

#### 20.2 — Fila da repaginada (aguardando direção do Daniel)
- [ ] **Specimen Home**: catálogo com previews ANIMADOS grandes (os cenários pv-* existem nos cards) no lugar da lista cinza de thumbnail 64px
- [ ] **Design system de inputs**: slider custom (thumb ◆ da marca), select e checkbox custom em shared/style.css — cobre as 38 de uma vez; maior alavanca de "cara premium"
- [ ] **Dark mode de verdade**: canvas bg segue tema por default (field expõe faixa preta + canvas cream), cinzas da home dark divergem, letras do painel kinetic invisíveis
- [ ] **Uma voz de idioma** (reco: UI 100% EN; decisão do Daniel)
- [ ] Pill "FREE" → rótulo claro de formato; dithering com demo art de entrada + anatomia alinhada; badge entry composition curada

### FASE 19 — SEGURANÇA / BLINDAGEM (pedido do Daniel 12/07: "cibersegurança completa nível premium — blindar cópia de ferramentas, código-fonte, prints e gravações de tela; avisar quando alguém tentar; blindar meus dados e engenharia reversa")

> **Reality check antes de tudo** (honestidade > vender ilusão): a Tipó é um app **100% client-side** (HTML/JS/CSS estático no Vercel, roda inteiro no browser do usuário). Isso impõe limites FÍSICOS que nenhuma técnica contorna:
> - **Impedir cópia do código-fonte: impossível em absoluto.** Pra rodar, o browser PRECISA baixar e executar o JS — ele está, por definição, na máquina do usuário. Dá pra *dificultar muito* (ofuscar/minificar), nunca *impedir*.
> - **Bloquear print / gravação de tela: impossível na web aberta.** Screenshot e screen-record são de nível de SISTEMA OPERACIONAL — uma página web não tem permissão pra vê-los nem barrá-los. DRM (Widevine/EME) só cobre *streams de vídeo protegido*, não canvas/app. Qualquer "proteção" aqui é teatro que quebra em 5s e atrapalha usuário legítimo.
> - **Detectar/avisar tentativa: heurística frágil, não garantia.** Dá pra logar SINAIS (devtools aberto, copy, right-click) mas todos são burláveis e a detecção de devtools é hack instável. Serve como telemetria, não como muralha.
>
> **O que É REAL e vale a pena** (blindagem de verdade, na ordem de impacto):
>
> **19.1 — Blindar DADOS e segredos (o mais importante — isso sim é 100% controlável)**
> - ✅ Varredura de segredos (2026-07-13): working tree + HISTÓRICO git completo — zero chaves/tokens/segredos (padrões sk-/AKIA/ghp_/hf_/api_key/Bearer). O site não tem backend nem env vars — nada a vazar hoje.
> - [ ] (quando 11.5 nascer) Mockup AI = BYO key do usuário, key só na memória da aba, nunca logada, nunca enviada pra backend nosso.
>
> **19.2 — Security headers + defesa de rede — ✅ (2026-07-13)**
> - ✅ **vercel.json** criado com: **CSP** (script-src restrito a self+jsdelivr com wasm-unsafe-eval pro ONNX do AI depth; connect-src permite huggingface pro download do modelo; img/media blob: pros exports), **frame-ancestors 'none' + X-Frame-Options DENY** (ninguém embeda a Tipó em iframe — anti-clickjacking e anti-roubo-por-incorporação), HSTS preload, nosniff, Referrer-Policy, Permissions-Policy (camera/mic só self).
> - ✅ **SRI sha384** nos 4 scripts de CDN pinados (p5, three, mp4-muxer, gsap) em TODOS os 39 HTML + crossorigin=anonymous — CDN comprometida = browser recusa o script adulterado.
> - ✅ Validado com Playwright injetando o header real: field/depth/dithering/index carregam com **zero violações de CSP**, scripts CDN executam (SRI confere), zero pageerrors. Nota: 'unsafe-inline' é necessário (scripts inline em todas as ferramentas) — a CSP protege pelas ORIGENS; remover inline exigiria build step (fica com 19.3 se rolar).
>
> **19.3 — Elevar a barra da engenharia reversa (deterrente honesto, não muralha)**
> - [ ] Build step opcional de **minificação + ofuscação** dos shared/*.js e das ferramentas no deploy (mantendo os fontes legíveis no repo). Transforma "copiar e colar" em "horas de deofuscação" — filtra 99% dos oportunistas. Sem prometer que barra o determinado.
> - [ ] Cabeçalho de licença/aviso legal nos arquivos + `LICENSE` no repo (proteção JURÍDICA — o desincentivo que de fato funciona contra cópia comercial).
>
> **19.4 — Proteger o OUTPUT (deterrente que realmente segura "roubo" de resultado)**
> - [ ] **Watermark de marca** opcional/sutil nos exports (PNG/MP4) — canto com "tipó" discreto. É o que estúdios usam: não impede o print, mas marca a autoria. Toggle pro usuário pagante remover.
>
> **19.5 — Telemetria de abuso (o "me avisar" possível, com expectativa calibrada)**
> - [ ] Endpoint leve de eventos (right-click bulk, copy de grandes blocos, devtools-open heurístico) → log/alerta. Explicitar: são SINAIS de curiosidade, não flagrante — servem pra entender comportamento, não pra "pegar o ladrão". Sem UX intrusiva (nada de bloquear F12/right-click, que só irrita).
>
> **19.6 — Se algum dia houver backend** (hoje não há): rate limiting, WAF do Vercel, validação de input server-side, CORS estrito.
>
> - **Como atacar:** usar o squad `.claude/skills/cybersecurity` (`*assess` no site → `*audit-app-security` → `*defend`) pra um assessment formal, priorizar 19.1+19.2 (impacto real imediato), depois 19.3/19.4. Escopo = review defensivo do próprio site (autorizado, é do Daniel).
> - **Status:** [ ] Registrado — aguardando "vai". Recomendação: começar por **19.1 (dados/segredos) + 19.2 (headers/SRI)** — é onde blindagem de verdade acontece; o resto é deterrente honesto, com a ressalva de que print/screen-record e cópia-de-fonte não têm solução técnica na web aberta.

### FASE 0 — Infraestrutura ✅
- [x] `shared/style.css` — design system (#99E0D2, dark/light theme, responsive)
- [x] `shared/recorder.js` — TipoRecorder (MP4 2D / WebM WEBGL / MP4 nativo Chrome 130+)
- [x] `shared/ui.js` — TipoUI: sliders, presets, export, recorder, theme toggle
- [x] `index.html` — landing page com hash routing + video previews
- [x] Git repo + Deploy Vercel
- [x] Migrar `dithering.html` pra usar shared CSS/JS — ✅ (2026-07-11) shared/style.css linkado ANTES do CSS local (empates resolvem pro local = visual preservado); cópia local do bottom sheet mobile deletada (2.9KB) — dithering agora herda sheet/micro-interações/toasts/h1-dot do shared. Regras do dropzone (dz-mobile/desktop) realocadas pro CSS da ferramenta. test-dither-engine + mobile sweep PASS.

### FASE 1-5 — 22 Kinetic Type Modes ✅
Todos implementados e funcionais. Ver detalhes na memoria.md.

### FASE 6 — Polish ✅
- [x] Favicon + meta tags + README + responsividade + dark/light theme
- [ ] Domínio custom — ação do Daniel

### VISUAL TOOLS ✅
- [x] **DITHERING** — Gold standard. 7-state luminance, 60+ shapes, video+webcam, MP4/PNG/SVG
- [x] **RETÍCULA** — 11 shapes, multi-tone, video+webcam, 9 presets
- [x] **GLITCH** — RGB shift, pixel sort, slicing, scanlines, video+webcam, 8 presets
- [x] **DATAMOSH** — Motion-vector codec simulation, cross-mosh, keyframe drops
- [x] **RASTRO** — Adobe-style Echo Effect, motion/drawn matte, blend operators, PNG alpha
- [x] **PIXEL SORT** — Asendorf-style sorting, arbitrary angle, threshold mask, drift
- [x] **DEPTH** — Image/video to 3D depth mesh, AI/manual/luminance depth
- [x] **GRADIENT MAP** — Luminance to draggable color ramp, tone curve, cycle
- [x] **RISOGRAPH** — Spot inks + CMYK halftone, overprint, grain, plates
- [x] **ASCII** — 4 charsets, 3 color modes, video+webcam, 8 presets
- [x] **OVERLAY** — 12 patterns seamless, image+video+webcam, live compositing, tile export
- [x] **AUDIOTYPE** — Audio-reactive typography, mic/audio upload, bar grids

---

## PRÓXIMAS FASES

### FASE 7 — Cavalry-Level Polish ✅ (elevar qualidade dos 22 modos existentes)

O objetivo é fazer cada modo do Tipó ter a fluidez e profissionalismo do Cavalry.
Atacar ANTES de criar ferramentas novas — polir o que existe primeiro.

#### 7.1 — Easing Curves profissionais ✅
- `TipoEase` library em shared/ui.js — 10 curvas (sine, quad, cubic, quart, quint, expo, circ, back, bounce, elastic)
- 3 direções: `in`, `out`, `inOut`
- Lookup dinâmico: `byIndex(idx, dir)` e `byName(name, dir)`
- Slider "Easing" adicionado em: Snap, Flash, Pow, Boost, Vessel
- Vessel migrado de 7 funções locais para TipoEase compartilhado (expandido 7→10 curvas)
- **Status:** [x] Implementado

#### 7.2 — Mouse Interaction ✅
- `TipoMouse` system em shared/ui.js — smoothed normalized coords (-1 to 1)
- Touch support (mobile via touchmove/touchend)
- Checkbox "Mouse React" + slider "Strength" opt-in
- **Field:** Letters repel from cursor (force inversamente proporcional à distância)
- **Danger:** Distortion center follows mouse position
- **Pow:** Explosion + assembly center follows mouse
- **Status:** [x] Implementado (Field, Danger, Pow) — expandir para Clutter depois

#### 7.3 — Noise orgânico ✅
- `TipoNoise` system em shared/ui.js — 3-harmonic sine-based jitter
- `jitter(seed, scale)` e `jitter2D(seed, scale)`
- Slider "Organic" (0-100) — controla intensidade do jitter
- Aplicado em: Snap (position + rotation), Boost (position), Flash (position)
- **Status:** [x] Implementado (Snap, Boost, Flash) — expandir para mais modos depois

#### 7.4 — Transições suaves entre presets ✅
- `applyPreset()` refatorado em shared/ui.js — morph de 300ms com TipoEase.inOut.cubic
- Captura estado antes/depois, anima sliders + colors simultaneamente
- `_lerpHex()` para interpolação suave de cores
- Funciona automaticamente em TODAS as 27 ferramentas
- **Status:** [x] Implementado

### FASE 7.5 — UI/UX Polish + Brand Identity (executada em 2026-06-10 — falta só 7.5.2 e smoke test visual)

Prioridade máxima — arrumar experiência antes de features novas.

#### 7.5.1 — Light mode como padrão
- [x] Mudar default do localStorage para `light` em todas as tools (+ base do :root no CSS invertida pra light, sem flash)
- [x] Manter toggle dark/light funcionando
- [x] Testar TODAS as ferramentas nos dois temas — ✅ (2026-07-11) smoke visual dark+light nas 39: grids de screenshots conferidos, zero pageerrors, nenhum contraste quebrado (light é olhado continuamente nas auditorias; dark varrido dedicado).

#### 7.5.2 — Header disruptivo ✅ (v2 em 2026-07-03 — aguardando validação visual do Daniel no deploy)
- [x] Header 96px com marquee TIPÓ 150px multicolor (teal/gold/mint) + stats "36 tools • 0 install • 100% browser"
- [x] Ghost text expressivo (stroke 2px, fills alternados, opacity up)
- [x] Linha gradient 4px fluindo em loop contínuo + cometa
- [x] Bônus: split panels com número gigante (13/23), ticker de nomes das ferramentas, previews mais visíveis

#### 7.5.3 — Paleta brand nos presets default
- [x] TODAS as ferramentas devem abrir com cores da paleta Athos (light mode):
  - Background: `#F8F5F0`, texto: `#1A1818`, accent: `#2A8A7A`, stroke: `#D4A040`
- [x] Presets criativos mantêm suas paletas próprias — só o default muda (resetAll também atualizado)
- [x] Auditar os 28 arquivos HTML um por um (109 color inputs; exceções: overlay baseColor, dithering)

#### 7.5.4 — Fix: edição de hex nos color pickers
- [x] Solução: campo de texto hex ao lado do color picker (TipoUI.initHexInputs, sync bidirecional + morph de presets)

#### 7.5.5 — Fix: gravação MP4/WebM
- [x] Coberto pelo stability pass de 2026-06-10 (race do _stopping, guard document.hidden, revoke timeout)

#### 7.5.6 — Auditoria geral de bugs
- [x] Coberto pelo stability pass de 2026-06-10 (leaks de object URL, AudioContext, p5.Graphics, TipoMouse, RAF stacking)

#### 7.5.7 — Cards dos menus: identidade visual
- [x] Visual Tools cards: preview fundo `#2b8a7c` (teal), letra inicial em âmbar `#D4A040`
- [x] Kinetic Type quadrantes: fundo teal, canvases desenhando em âmbar
- [x] Animações/ícones existentes preservados (vars --text-* remapeadas no escopo do preview)

#### 7.5.8 — Botão Voltar em todas as páginas
- [x] Botão flutuante `←` consistente em TODAS as 28 ferramentas (TipoUI.initBackButton + manual em overlay/dithering)
- [x] Retorna ao menu correto (Visual Tools ou categoria Kinetic); back-links dos painéis corrigidos pra categoria certa

---

### FASE 7.6 — Export Pro: gravação de vídeo + PNG (TODAS as ferramentas) ✅ (2026-06-10)

#### 7.6.1 — Gravação de vídeo com interação ao vivo ✅
- [x] Parâmetros ao vivo durante gravação (letterbox aspect-fit no record canvas — resize seguro)
- [x] Vídeo exporta perfeito (codec H.264 por resolução, cap 4K, isConfigSupported, firstTimestampBehavior offset)
- [x] Play fluido (keyframes por tempo a cada 1s, timestamps real-time, fastStart in-memory)
- [x] Validado nas 28 ferramentas via Playwright (test-recording.mjs + test-recording-kinetic.mjs + overlay dedicado) — MP4 decode clean no ffmpeg

#### 7.6.2 — Export PNG ✅
- [x] savePNG reescrito em toBlob (28/28 OK)
- [x] PNG alpha via chroma-key do bgColor (ramp de borda + un-mixing); exato no dithering
- [x] Botão "PNG α" injetado automaticamente (TipoUI.initAlphaButton); glitch sem alpha por design (não tem bgColor)

---

### FASE 8 — Dithering Engine Pro (inspirado na análise do Dither Boy) ✅ COMPLETA (2026-06-12)

Engenharia reversa do Dither Boy 6.0.3 (Electron app, Studio AAA) revelou:
- 73 algoritmos de dithering (bytecode protegido, mas todos são algoritmos públicos)
- Pipeline de 9 efeitos encadeados (código extraído do imageProcessor.worker.js)
- 82 paletas de cores (dados extraídos)
- Metadados completos (controles, ranges, defaults) dos 73 algoritmos
- Efeitos como Epsilon Glow, Chromatic Aberration, JPEG Glitch (código legível)

Fonte da análise: `/tmp/ditherboy-src/` (app.asar extraído)

#### 8.1 — Pipeline de Efeitos Encadeado no dithering.html ✅ (2026-06-10)
- [x] **Adjustments** (pre): brightness, contrast, saturation, hue, midtones (gamma), blur — via canvas filter no downsample + gamma na luminância
- [x] **Dither** (core): algoritmo selecionado + paleta (computeStateGrid compartilhado entre render e exportSVG)
- [x] **Tint/Color Overlay**: cor + 15 blend modes + opacity (pós-render; effectiveBgColor mantém PNG α correto com tint ligado)
- [ ] Post-processing extra (sharpen, denoise) — adiado (precisa convolução, custo por frame)

#### 8.2 — Error Diffusion Clássicos ✅ (2026-06-10)
- [x] **Floyd-Steinberg** (1976), **Atkinson** (1984), **Stucki** (1981), **Burkes** (1988)
- [x] **Sierra / Sierra Lite / Two-Row Sierra**, **Jarvis-Judice-Ninke** (1976)
- [x] Serpentine scan toggle + Strength slider (0-100%)
- [x] Integrado na quantização dos 7 estados — funciona com shapes, scale, rotation, paletas, SVG export
- [x] Validado via Playwright (test-dither-engine.mjs): 13 algoritmos distintos, MP4 clean, 25 renders/s @ gridRes 160 + JJN

#### 8.3 — Ordered Dithering + Patterned ✅ parcial (2026-06-10)
- [x] **Bayer Matrix** (2x2, 4x4, 8x8, 16x16) — geração recursiva, spread de ±1 nível de quantização
- [ ] Bit Tone / Crosshatch / Stippling / Diamond / Checkers — já parcialmente cobertos pelo sistema de shapes (60+ shapes por estado); avaliar se valem como algoritmos próprios

#### 8.4 — COLOR HALFTONE (CMYK)
Imagem → separação CMYK com dots em ângulos diferentes por canal.
- **Técnica:** 4 passes (C/M/Y/K) com supersampling anti-aliased + dot gain
- **Controles:** Cell size, dot gain, ângulos por canal (C:15° M:75° Y:0° K:45°), GCR, supersample
- **Referência:** Código extraído do Dither Boy (halftone completo no worker) + processo offset real
- **Video+webcam input**
- **Status:** ✅ Implementado (2026-06-11) — integrado no riso.html como modo "CMYK Process" (decisão do Daniel: uma ferramenta só). Separação RGB→CMYK com GCR slider, 4 canais nos ângulos clássicos (C 15° / M 75° / Y 0° / K 45°), cores editáveis, Ink amount por canal, grain/misreg/dot gain valem nos 2 modos, 3 presets CMYK (CMYK, Newsprint, Comic), separações exportam 4 plates transparentes. Validado via Playwright (13/13)

#### 8.5 — Epsilon Glow (efeito exclusivo extraído)
Glow seletivo baseado em luminância com distance map:
- **Técnica:** Luminance threshold → soft mask → distance map → gaussian blur (aspect-aware) → weighted composite
- **Controles:** Threshold, smoothing, radius, intensity, aspect ratio, direction, falloff, epsilon, distance scale
- **Referência:** Código completo extraído do Dither Boy worker (funções legíveis)
- **Status:** ✅ Implementado (2026-06-11) — seção "Epsilon Glow" no dithering.html, pós-tint (ordem do pipeline Dither Boy). Soft threshold smoothstep → 3 oitavas de blur anamórfico (squeeze+rotate, distance map aproximado) → normalização g/(g+ε) → screen composite, computado a ≤420px (low-frequency). 9 controles. 12/12 testes Playwright, ~23 renders/sec no pior caso (anamórfico rotacionado).

#### 8.6 — RISOGRAPH (EXCLUSIVO TIPÓ — não existe no Dither Boy!)
Simulação de impressão Risograph no browser:
- **Separação de tintas:** 1-3 cores spot (Pantone Riso: vermelho, azul, preto, verde, pink, etc.)
- **Misregistration:** Registro imperfeito entre camadas (offset X/Y randômico por camada)
- **Textura de grão:** Grain da tinta Riso (não é noise digital — é textura orgânica)
- **Overprint:** Cores se misturam onde sobrepõem (multiply blend)
- **Halftone por camada:** Cada cor pode ter halftone independente
- **Controles:** Cores (picker + presets Riso), misregistration amount, grain intensity, halftone size, overprint opacity
- **Presets:** Classic Riso (red+blue), Zine (black+pink), Poster (3 cores), Editorial, Punk
- **Image+video+webcam input**
- **Export:** PNG (composite), PNG por camada (separação), MP4
- **Status:** ✅ Implementado (2026-06-10) — riso.html: 18 tintas Riso reais, 1-3 camadas com separação tonal (gamma por slot), halftone rotado por camada (15°/75°/45°), dot gain, grão de tinta orgânico (destination-out), misreg com seed + reroll, overprint multiply sobre cor de papel, 6 presets, demo source, export PNG 2x + separações por camada + MP4. Validado via Playwright (8/8)

#### 8.7 — Paletas de Cores Expandidas ✅ parcial (2026-06-10)
- [x] +16 paletas curadas (40 total): Athos (brand), Game Boy, CGA, C64, Apple II, Riso R/B, Riso Zine, Riso Poster, Sepia, Newsprint, Teal&Orange, Infrared, Pastel, Term Amber, Blueprint, Acid
- [ ] Expandir mais se necessário (Dither Boy tinha 82 — /tmp/ditherboy-src foi perdido, recriar do app se precisar)

#### 8.8 — Efeitos Glitch Avançados (códigos extraídos)
Turbinar o glitch.html existente com efeitos do Dither Boy:
- **Block Shift** — Deslocamento de blocos 8x8 randômico
- **Block Scramble** — Embaralha blocos da imagem
- **Channel Swap** — Troca canais RGB por bloco
- **Scanline Offset** — Deslocamento horizontal por scanline
- **Interlace Corruption** — Corrupção de linhas entrelaçadas
- **Chromatic Aberration** — Displacement per-channel (R/G/B independentes)
- **Referência:** Código completo extraído (funções legíveis no worker)
- **Status:** ✅ Implementado (2026-06-11) — Block Shift, Block Scramble, Channel Swap (por bloco), Scanline Offset, Interlace adicionados ao glitch.html (Chromatic Aberration já coberta pelo Channel Shift existente). Pixel sort + noise + novos efeitos pixel-level unificados num único loadPixels (perf). Presets vhs/corrupt/datamosh/crt/static/chaos atualizados. Help tooltips. 30fps no chaos. Validado via Playwright

#### 8.9 — AUDIOTYPE (Audio Visualizer Tipográfico — EXCLUSIVO TIPÓ)
Tipografia reativa a áudio — letras compostas por barras coloridas que pulsam com a música.
Inspirado no "Line Dither Engine" do @antoncreations (Instagram reel).
- **Conceito:** Upload letra/texto + upload áudio → barras horizontais/verticais cujo tamanho reage às frequências
- **Como funciona:**
  1. Texto renderizado em canvas offscreen
  2. Imagem do texto amostrada em grid (colunas × linhas)
  3. Luminosidade de cada célula → altura/largura da barra
  4. Áudio via Web Audio API → AnalyserNode → frequencyData
  5. Bandas de frequência mapeadas para as barras (graves=esquerda, agudos=direita OU por linha)
  6. Barras pulsam: tamanho base (luminosidade) × multiplicador do áudio
- **Modos de grid:**
  - Horizontal bars (como no reel — barras empilhadas)
  - Vertical bars (colunas lado a lado)
  - Pixel grid (quadrados)
- **Níveis de cor:** 4 ou 8 faixas de luminosidade, cada uma com cor customizável
  - Ex: shadows=#000, darks=#purple, mids=#orange, highlights=#white
  - Presets de paleta: Neon, Mono, Warm, Cool, Pride
- **Controles:**
  - Grid density (quantas barras/colunas)
  - Gap (espaço entre barras)
  - Min/Max size (range do tamanho das barras)
  - Shrink axis (height vs width vs both)
  - Dynamic shrink (barras encolhem/crescem com o áudio)
  - Audio intensity (sensibilidade ao áudio)
  - Audio frequency range (graves vs agudos vs full)
  - Smoothing (suavização da reação ao áudio)
  - 4 ou 8 color levels
- **Inputs:**
  - Texto digitado (renderizado com font) OU upload de imagem/letra custom (JPG/PNG)
  - Upload de áudio (MP3/WAV) OU microfone em tempo real
- **Export:**
  - PNG (frame estático — a letra em barras, sem áudio)
  - JPG por letra individual (para compor no After Effects)
  - MP4 (vídeo com áudio, gravação em tempo real via TipoRecorder)
- **Presets:** Equalizer, Waveform, Spectrum, Pulse, Minimal
- **Diferencial vs reel original:** O cara usa Gemini+After Effects (multi-step manual). Tipó faz tudo no browser, em tempo real, com export direto.
- **Stack:** Web Audio API (AnalyserNode + FFT), Canvas 2D, TipoRecorder
- **Status:** ✅ Implementado (2026-06-10, audiotype.html) — texto/imagem → grid de barras, AnalyserNode+FFT, 3 modos (horizontal/vertical/pixel grid), 2-8 níveis de cor, áudio upload + microfone, idle animation, 8 presets, export PNG+MP4. Na landing como Visual Tool. Itens não implementados do spec: JPG por letra individual (avaliar demanda)

#### 8.10 — DEPTH (Image → 3D) 
Upload imagem 2D → gera depth map → cria mesh 3D interativo.
- **Técnica:** Fragment shader com depth map displacement (Codrops approach)
- **Depth map:** AI via TensorFlow.js (DepthAnything/MiDaS) OU upload manual
- **Interação:** Mouse/touch parallax, gyroscope mobile, rotation
- **Controles:** Displacement strength, mesh resolution, rotation speed, zoom, lighting
- **Export:** PNG (screenshot 3D), MP4 (rotation loop), depth map PNG
- **Stack:** three.js ou raw WebGL, nada de p5.js (performance)
- **Status:** ✅ Implementado (2026-06-12) — depth.html standalone com three.js (UMD r146). PlaneGeometry subdividida (16-400 segs) + ShaderMaterial: vertex desloca por depth texture, fragment com shading fake por derivadas do depth. 3 fontes de depth: Luminance (instantânea, ao vivo com video/webcam), AI (Depth Anything V2 small via transformers.js, lazy ~40MB, q8) e upload manual de depth map. Contrast/smooth/invert pós-processam o depth (canvas filter ≤320px) com preview no painel. Mouse parallax suavizado + órbita senoidal automática (perfeita pra loop MP4), zoom, wireframe. 6 presets (relief/pop/wire/orbit/canyon/hologram). Export PNG + Depth PNG (1024px) + MP4. 15/15 testes Playwright.

#### 8.11 — GRADIENT MAP
Upload imagem → mapeia luminosidade pra paleta de cores custom.
- **Diferente do Duotone (removido):** N cores, não 2. Gradiente completo.
- **Controles:** 5-10 color stops arrastáveis, curva de contraste, mix com original
- **Referência:** Gradient Map do Photoshop
- **Video+webcam input**
- **Status:** ✅ Implementado (2026-06-12) — gradientmap.html standalone. Editor de gradiente com 2-10 stops arrastáveis (click na barra adiciona stop sampleando a cor atual da rampa, drag move, dblclick remove, Distribute equaliza, color picker no selecionado, reverse). LUT 256 entradas + tone curve: contraste S (tanh), brightness, posterize 0-16 (look serigrafia), mix com original. Cycle anima a rampa pela imagem no tempo (MP4 de imagem parada). Loop contínuo só quando dinâmico (video/webcam/cycle/rec). 8 presets (Athos brand/Duotone/Sunset/Infrared/Chrome/Neon/Sepia/Acid). 14/14 testes Playwright (LUT endpoints exatos, reverse, stops, tone, cycle anima, webcam, PNG, MP4 limpo 30fps, ~637 renders/s demo).

#### 8.12 — PIXEL SORT
Upload imagem/video → pixel sorting artístico.
- **Técnica:** Ordena pixels por brightness/hue/saturation em faixas
- **Controles:** Direction (H/V/diagonal), threshold, sort by (brightness/hue/sat), range
- **Referência:** Kim Asendorf pixel sorting, glitch art community
- **Video+webcam input**
- **Status:** ✅ Implementado (2026-06-11) — pixelsort.html standalone. Sorting por intervalos (máscara de threshold low/high + invert), 6 sort keys (brightness/hue/sat/R/G/B), angle 0-360° (fast paths 0/90/180/270 + rotação interna pra ângulos arbitrários com gate de alpha), max span, randomness (quebra de intervalos), mix com original, drift animado (janela de threshold varre com seno — anima imagem parada pra MP4). 7 presets, 4 help icons. 14/14 testes Playwright (inclui verificação de monotonicidade da linha sorteada), 30fps no pior caso.

#### 8.13 — DATAMOSH (ferramenta nova, pegada profissional After/Cavalry)
Datamosh real é abuso de compressão de vídeo: remover I-frames (keyframes) faz os P-frames
aplicarem motion vectors sobre conteúdo errado → a imagem "derrete" e se arrasta.
No browser não dá pra mexer no stream H.264 — a técnica é SIMULAR o codec:
estimar motion vectors por bloco (block matching, igual MPEG) e aplicá-los num
canvas acumulado em vez de desenhar o frame novo.

**Arquitetura (pipeline)**
1. Frame N e N-1 em baixa resolução (half-res grayscale) → block matching por grid
   (blocos 8/16/32px, busca ±radius) → campo de motion vectors
2. Canvas acumulado ("decoded frame"): em vez de pintar o frame novo, cada bloco do
   canvas acumulado é movido pelo vector correspondente (copy por bloco)
3. Keyframe drop/restore controla quando o frame real entra de volta

**Modos (o coração da ferramenta)**
- **Smear (I-frame drop):** frame novo nunca entra; só os vectors movem o conteúdo antigo — o clássico "pessoa atravessa a cena arrastando o fundo"
- **Melt (P-frame duplication):** os mesmos vectors aplicados N vezes por frame — tudo escorre na direção do movimento (efeito "bloom" do datamosh)
- **Hybrid:** mistura com blend slider (% de frame real que vaza de volta)
- **Cross-Mosh (PRO, diferencial):** motion de um vídeo B aplicado sobre imagem/vídeo A — ex: dança dirigindo o derretimento de um retrato (estilo style-transfer de movimento)

**Controles (nível After/Cavalry)**
- Block Size (4-64) + Search Radius (qualidade da estimativa, 2-16)
- Mosh Amount (0-100: % de blocos que sofrem mosh vs frame real)
- Melt Iterations (1-8: repetição dos vectors por frame)
- Vector Multiplier (0.5-4x: amplifica o movimento estimado)
- Vector Jitter (ruído aleatório nos vectors)
- Direction Bias (vetor fixo somado: derrete pra baixo/cima/lado, com angle+força)
- Decay/Persistence (fade do acumulado de volta pro real, 0 = mosh eterno)
- Threshold de movimento (blocos parados não mosham — preserva fundo)
- Keyframe: botão "Drop Keyframe" (reset manual, momento de impacto), auto-interval (a cada N seg), e "Sweep Recovery" (keyframe entra por wipe linha a linha, como stream se recuperando)
- Channel Mosh: aplicar vectors só em R, G ou B (rasgo cromático)
- **Trigger por clique no canvas** = drop keyframe naquele momento (performático, tipo VJ)
- **Presets:** Classic Mosh, Melt Down, Bloom, Ghost Trail, Channel Tear, Cross-Mosh, Subtle Drift, Total Collapse
- **Input:** vídeo (principal), webcam, imagem (precisa de motion source externo ou jitter procedural); Cross-Mosh aceita 2 sources
- **Export:** MP4 (TipoRecorder), PNG do frame atual
- **Performance:** block matching em half-res grayscale (Uint8Array), grid ~40×30 blocos, busca em espiral com early-exit; alvo 30fps @ 720p. Se JS não der, fallback: diamond search ou redução do search radius. (WebGL/WASM só se necessário)
- **UI:** seção Codec (block size, search), seção Mosh (modo, amount, melt, decay), seção Vectors (multiplier, jitter, bias), seção Keyframe (drop, auto, sweep), help tooltips em tudo
- **Por que é exclusivo:** datamosh hoje = Avidemux/AE com plugins pagos (Datamosher Pro ~US$40) e workflow destrutivo offline. Ninguém tem datamosh paramétrico em tempo real no browser com webcam.
- **Status:** ✅ Implementado (datamosh.html) — block matching espiral em grayscale 192px, acumulador ping-pong, melt 1-6x, recover, sweep recovery, cross-mosh (Video B), channel mosh display-only, bias/jitter, click=keyframe, 7 presets, 5 help tooltips. 12/12 testes Playwright, ~28fps no preset mais pesado.

#### 8.14 — RASTRO (Temporal Echo / Afterimage Trails)
Ferramenta nova pedida pelo Daniel a partir de referências de rastro circular, repetição temporal e smear/mesh em vídeo.
- **Conceito:** imagem/vídeo/webcam vira Echo Effect temporal, usando frames anteriores do próprio layer. Pode ser arquivo final ou elemento com fundo alpha para composição.
- **Modelo:** Adobe-like `Echo Time`, `Number of Echoes`, `Starting Intensity`, `Decay`, `Echo Operator`.
- **Operadores:** Composite In Front, Composite In Back, Add, Screen, Maximum, Minimum, Blend.
- **Controles Cavalry-like:** todos os ranges recebem TipoBehavior `~`; Echo Time, Echoes, Intensity, Decay, Source Scale, Move X/Y, Threshold, Softness, Feather, Still Motion, Trail Blur, Exposure.
- **Interação:** `Drag canvas to pull source` move a imagem/fonte no canvas, sem resetar o histórico; o puxão gera echo temporal e é gravado no MP4.
- **Matte/Alpha:** Full Layer, Motion Difference, Drawn Mask, Chroma Key, Luma Bright/Dark; Background Source/Transparent/Solid; export `PNG alpha`.
- **Default visual:** preset Sports e demo em paleta Tipó minimalista (`#F8F5F0`, teal, gold, preto), sem fundo laranja/blocos.
- **Still image:** Orbit/Spin/Push/Zoom cria variação temporal para imagem parada, porque Echo só aparece quando o layer muda no tempo.
- **Observação técnica:** MP4/H.264 não preserva alpha portável. A ferramenta entrega PNG alpha agora; futuro possível: sequência PNG alpha, WebM VP9 alpha ou mask tracking/optical flow.
- **Status:** ✅ Rebuild implementado (2026-06-23) — `rastro.html`, card no index, `_backTargets` atualizado, `test-rastro.mjs` PASS (source composite, Count/Decay, scale, drag/pull history, operadores, drawn mask alpha, motion matte, Still Motion, behaviors, PNG alpha, MP4), incluído no `test-rec-sweep.mjs` com preset `sports`.
- **Perf fix (2026-07-01):** regressão do V5 fullscreen (20.8fps/31 stutters na gravação) corrigida — echo accumulator half-res (exato pra source-over), canvas pool no history, willReadFrequently removido do mainCtx, loop 30fps. Sweep: 30fps cravados, 0 stutters. Bônus: bug do motion matte opaco (premultiply no prev) corrigido — 13/13 no test-rastro.

### FASE 9 — CAVALRY MODE (animação fluida e intuitiva, aprovado pelo Daniel 2026-06-12)

O Daniel quer a sensação de animação do Cavalry dentro da Tipó ("o Cavalry é mais a cara da Tipó").
Não é clonar o Cavalry (scene graph completo = inviável) — é trazer os 4 conceitos que fazem
a animação dele ser fluida e profissional. Ordem de implementação: maior ganho pelo menor custo.

#### 9.1 — Behaviors (oscilar qualquer slider — o coração do Cavalry)
- Qualquer slider de qualquer ferramenta ganha um botão "~" (animate): o valor passa a oscilar sozinho
- **Tipos de behavior:** Oscillator (senoide), Noise (TipoNoise orgânico), Loop (sawtooth/ping-pong), Random Step
- **Controles por behavior:** amplitude (% do range do slider), velocidade, fase, centro (valor base)
- Implementar em `shared/ui.js` (TipoBehavior) — um rAF central atualiza todos os sliders animados e dispara `input`
- UI: clique no "~" abre mini-popover (tipo/amp/speed); slider animado ganha highlight visual
- Persiste no preset morph (behaviors pausam durante transição)
- **Impacto:** tudo vira animável sem keyframe — muda completamente a gravação de MP4
- **Status:** ✅ Implementado (2026-06-12) — TipoBehavior em shared/ui.js, auto-init via DOMContentLoaded + MutationObserver (pega sliders criados dinamicamente, ex: layers do riso e painel do dithering). Botão "~" injetado em todo `.range-row input[type=range]` das 34 ferramentas; clique inicia behavior + abre popover (Type: Oscillate/Noise/Loop/Ping-Pong/Random Step, Amount %, Speed) com botão off. rAF central ~30fps atualiza sliders e dispara `input` (bubbles) — labels e renders reagem como drag real. Drag manual (evento trusted) re-centraliza; preset morph do TipoUI pausa e re-sincroniza centers no fim. CSS auto-injetado com fallbacks de var (funciona no dithering.html self-contained). Sliders sem id ganham id automático; behavior para sozinho se o slider for removido do DOM. Opt-out via `data-nobhv`. test-behaviors.mjs 14/14 + smoke nas 33 páginas históricas; `test-rastro.mjs` valida behaviors do Rastro.

#### 9.2 — Stagger / Delay por índice
- Tudo que é multi-elemento (field, stripes, cascade, duplicator) ganha "Stagger": offset de fase por índice/linha/coluna/distância do centro
- Curvas de stagger usando TipoEase (linear, inOut, random)
- **Status:** ✅ Implementado (2026-06-12) — `TipoStagger` em shared/ui.js: `t(mode, col, row, cols, rows)` normalizado 0..1 (index/row/col/center/random com hash senoidal determinístico) e `phase(...)` = eased(t) × (amount/100) × 2π; curvas linear/inOut/in/out via TipoEase.cubic. Integrado no **field** (offset somado nos 7 engine calls: zW/xW/yW/zRot/strX/strY), **stripes** (sinEng ganhou param `ph`, stgAt(i,k) nos 5 call sites; labels Row→"Ribbon", Col→"Character") e **cascade** (sinEng + ph nos grids normal e mirror). UI padrão: seção Stagger com Mode (Off/Index/Row/Col/Center/Random), Amount 0–200, Curve; resetAll restaura. test-stagger.mjs 20/20 PASS (unit math + render determinístico via noLoop + frameCount fixo + redraw nos 3 tools) + smoke 34 páginas OK. Duplicator (9.3) já nasce com stagger.

#### 9.3 — Duplicator (ferramenta nova)
- Texto ou forma duplicado em distribuições: grid, círculo, espiral, linha, path desenhado à mão
- Offset por índice: rotação, escala, cor (gradiente entre 2 cores), opacity
- Combina com Behaviors (9.1) + Stagger (9.2) → animação em cascata estilo Cavalry
- Export MP4/PNG padrão
- **Status:** ✅ Implementado (2026-07-01) — duplicator.html (p5 2D, TipoUI, categoria Composition). 8 elementos (char cycle/word/circle/ring/square/triangle/star/plus), 5 distribuições (grid/circle/spiral/line/drawn path com resample por arc-length), Per-Copy Offset (rotate step, scale start→end, fade end), Color Mode (gradient A→B/alternate/single), animação wave (pulse/twist/drift/speed) com fase por TipoStagger (UI padrão Mode/Amount/Curve), Align to path, Angle global (animável via behavior = spin). 9 presets (ring/galaxy/tunnel/wave/confetti/orbit/snake/vortex/pride). Default brand: grid 7×5 teal→gold, stagger center. test-duplicator.mjs 22/22 PASS (inclui path desenhado via mouse drag, PNG α, MP4 ffmpeg clean).

#### 9.4 — Mini-Timeline com keyframes + easing curves
- GSAP já está no projeto — usar gsap.timeline() como engine
- Gravar keyframes de qualquer slider em pontos no tempo; curva de easing visual entre keyframes (TipoEase picker)
- Scrub, play/pause, loop, duração configurável; export MP4 do trecho exato (frame-accurate)
- O mais ambicioso da fase — fazer por último, quando 9.1-9.3 validarem a UX
- **Status:** ✅ Implementado (2026-07-02) — `TipoTimeline` em shared/ui.js (sem GSAP: interpolação própria + TipoEase, mesmo contrato de eventos do TipoBehavior). Botão ⏱ flutuante em TODAS as 35 ferramentas (gate: página tem recBtn/recordBtn). Auto-key AE-style: com a barra aberta, mexer qualquer slider grava keyframe no playhead (só eventos trusted — playback/behaviors não re-keyam). Tracks por slider com losangos arrastáveis (retime), dblclick deleta, inspector de easing por segmento (Linear + 10 curvas TipoEase × in/out/inOut). Transport: play/pause/loop/scrub/duração 1-60s. REC = grava exatamente 1 passada do timeline em MP4 (validado: timeline 2s → MP4 2.01s). Playback pausa TipoBehavior e resync no fim. test-timeline.mjs 22/22 PASS + smoke 35/35 páginas. FASE 9 COMPLETA.

### FASE 12 — Features Transversais (todas as ferramentas)

#### 12.1 — Custom Font Upload
- Upload de .ttf/.otf/.woff2 via drag & drop
- loadFont() do p5.js aceita TTF/OTF
- Fallback pra IBM Plex Mono se falhar
- **Impacto:** Alto — criadores querem suas fontes
- **Status:** ✅ Implementado (2026-07-02) — `TipoFont` em shared/ui.js, auto-injetado em toda página com `#textInput` (24 tools). Botão "Aa Font" + file picker (.ttf/.otf; .woff2 rejeitado — p5 não parseia), label da fonte atual, botão ↺ de reset pro IBM Plex Mono. Swap global via `loadFont()` + `textFont()` (2D E WEBGL); evento `tipofont` pros 4 tools com cache de glyphs (danger/ribbon/badge/audiotype — hooks de 1 linha invalidam cache/buffer). Session-only. test-font.mjs 11/11 PASS (Comic Sans do sistema: 2D, WEBGL, 3 caches, reset round-trip exato, arquivo inválido rejeitado) + smoke 35/35.

#### 12.2 — GIF Loop Export
- Gravar N frames → encodar como GIF animado
- Lib: gif.js (WebWorker-based) ou CCapture.js
- Botão "Export GIF" ao lado de PNG/MP4
- Loop perfeito: calcular ciclo baseado em speed/frameCount
- **Impacto:** Alto — formato mais compartilhável em redes sociais
- **Status:** ✅ Implementado (2026-07-02) — `TipoGIF` em shared/ui.js, botão "GIF" auto-injetado ao lado do Record nas 35 ferramentas. Lib: **gifenc** (mais rápida que gif.js, sem worker) via `import()` dinâmico do ESM no 1º clique — zero peso de página. Captura 3s @ 20fps do canvas ao vivo, ≤640px, quantize 256 cores por frame, progresso no botão (REC %/GIF %). **Loop perfeito via timeline**: com a timeline aberta e 2+ keyframes, captura exatamente UMA passada (timeline 2s → GIF 2.00s/40 frames, validado). test-gif.mjs 11/11 PASS (GIF89a, duração/frames exatos, animação capturada, riso standalone, ffmpeg decode clean).

#### 12.3 — Share via URL
- Serializar estado dos sliders + cores + preset no URL hash
- Ex: `cylinder.html#r=250&s=8&c=ff0000`
- Botão "Copy Link" que copia URL com state
- **Impacto:** Alto — compartilhar criações sem export
- **Status:** ✅ Implementado (2026-07-02) — `TipoShare` em shared/ui.js. Botão "Link" ao lado do GIF nas 35 ferramentas: serializa TODOS os controles com id (range/color/checkbox/select/text) em `#s=id:valor;...` e copia pro clipboard (fallback prompt). Ao abrir o link, aplica os valores e dispara input/change — labels e render seguem. Segundo passe de apply após 900ms cobre painéis construídos por JS (dithering validado). Exclui controles internos (timeline/behavior popover/font row/hex inputs); opt-out `data-noshare`. test-share-full.mjs PASS (round-trip com texto acentuado, cor, checkbox, label formatada).

#### 12.4 — Fullscreen Mode
- Botão F para fullscreen (esconde panel, canvas 100vw×100vh)
- ESC pra sair
- **Status:** ✅ Implementado (2026-07-02) — `TipoFull` em shared/ui.js. Botão ⛶ (top-right, ao lado do theme toggle) ou tecla F: esconde painel + todo o chrome flutuante (back/theme/timeline/⛶) e dispara `resize` pros canvases refitarem (p5 windowResized/ResizeObserver). F ou ESC sai; toast explica na entrada; digitar "f" em inputs não dispara. Cobre painel `.tipo-panel` E `#controlPanel` (dithering). test-share-full.mjs PASS (canvas 860→1280→960). **FASE 12 COMPLETA.**

### FASE 10 — Refinamento Visual (match com Space Type Generator)

#### Prioridade Alta
- [x] **FLAG** — ✅ Font engine vetorial completo (2026-07-03): **shared/flagfont.js** — fonte esqueleto própria, cada glyph = polilinhas/arcos/splines Catmull-Rom em espaço (u,v) da célula. Renderer com **bilinear interpolation real**: cada traço é subdividido (GLYPH_SUBDIV 7) e cada ponto mapeado pela quad deformada — os traços CURVAM com a bandeira (antes eram retas entre cantos). 72+ glyphs: A-Z com curvas de verdade (bowls B/C/D/G/O/P/Q/R/S), 0-9, pontuação, **acentos PT-BR completos** (Á À Â Ã É Ê Í Ó Ô Õ Ú Ç Ñ... — marcas acima/abaixo da célula via extrapolação bilinear). Bugs mortos: **Ó renderizava como pontinho** (o demo default TIPÓ mostrava "TIP·"!) e **colaWave com texto invisível** (ribbon depth 0 pintava por cima do texto na mesma profundidade — ordem de desenho invertida, fita primeiro, texto depois; pré-existente, confirmado no HEAD via worktree). Perf: 30fps cravado no pior caso (origami 18 rows × 11 chars). test-flagfont.mjs 7/7 + test-recording-kinetic PASS.
- [x] **CASCADE** — ✅ (2026-07-11) side-by-side com o STG real (screenshotado ao vivo): nosso cascade renderizava uma TORRE de 130px (texto 4-char × X-Scale 20) vs a parede full-canvas do original (que assume frase longa). Fix: texto repetido em tiles de palavra inteira pra preencher a largura (mesma cura do cylinder). Agora é a parede diagonal completa com fitas brand. Recording OK.
- [x] **MORISAWA** — ✅ (2026-07-11) modernizada ALÉM do original: styles por fileira (fill/outline/alternate/highlight), paleta 3 cores, ritmos Wall/Pulse, direções alternadas, skew. Wrap de marquee corrigido por módulo. O clássico preservado no preset Maeda.

#### Prioridade Média
- [x] Refinamento Fases 3-5 — ✅ auditados em 2026-07-11 (auditoria tipográfica + smoke dark/light): os 13 modos renderizam corretos nos dois temas, com a fonte nova, gravando MP4. Badge teve a faixa consertada (knockout+wrap). Ajuste ESTÉTICO fino adicional fica sob demanda do Daniel (preset a preset é decisão de gosto).

### FASE 11 — Expansão de Ferramentas Criativas

#### 11.1 — Pattern Generator
- Geração de padrões geométricos repetitivos (tessellation)
- Controles: shape, repetition, rotation, scale, color palette
- Export como PNG tileable + SVG
- **Status:** ✅ Implementado (2026-07-03) — pattern.html (standalone Canvas 2D, ferramenta #36). 8 motifs (Quarter Arcs Truchet, Diagonal, Triangle, Semicircle, Circle, Diamond, Cross, Letter do texto) × 5 regras de simetria (Repeat/Alternate/Mirror/Rotate90/Random com seed — random com período 6 pra manter tiles seamless). Motion com fase por TipoStagger (Spin/Pulse/Speed/Stagger). Cores brand default, 4 modos de distribuição. Exports: PNG, **Tile PNG seamless** (anel extra de células com wrap — caps de stroke atravessam a borda sem seam, validado por pixel diff na junção), **SVG vetorial** (mesmo tile em paths), MP4/GIF via shared. 8 presets (Truchet/Waves/Scales/Geo/Checker/Type/Terrazzo/Pipes). TipoFont ganhou caminho FontFace pra canvas 2D (fonte custom funciona no shape Letter). test-pattern.mjs 16/16 PASS.

#### 11.2 — Color Palette Generator
- Upload imagem → extrai paleta dominante (5-10 cores)
- Gera paletas complementares, análogas, triádicas
- Export como ASE (Adobe), CSS variables, JSON
- **Status:** ✅ Implementado (2026-07-03) — palette.html (standalone Canvas 2D, ferramenta #37). Extração por **median cut determinístico** (corte 3×N profundo + merge de clusters ΔRGB<38 — evita fundo dominante duplicado e resgata cores pequenas como o ink do wordmark). Colors 3–10, Sort por Population/Luminance/Hue. **6 harmonias HSL** (Complementary/Analogous/Triadic/Split/Tetradic/Mono) a partir de uma base — default = cor mais cromática (não a mais populosa, senão as harmonias viram lavagem quase branca). Interações: clique no swatch = base + copia hex, clique na imagem = conta-gotas, upload por botão/drag&drop/⌘V. Exports: **ASE binário** (ASEF v1, blocos RGB float32 BE — abre no Illustrator/Photoshop), CSS :root vars, JSON estruturado (rgb/hsl/população), PNG do card. Demo brand (coil teal + banda gold + quarter mint + TIPÓ ink sobre cream → extração cai na paleta Athos). ui.js: TipoShare/TipoFull aceitam âncora `[data-share-anchor]` pra ferramentas sem botão de gravação. test-palette.mjs 23/23 PASS (inclui validação binária do ASE em Node e ângulos das harmonias).

#### 11.3 — Mockup Compositor
- Upload arte 2D + seleciona mockup (poster, camiseta, tela, cartão)
- Perspectiva + lighting automáticos
- Inspirado no Brand Forge mas simplificado (sem IA)
- **Status:** ✅ Implementado (2026-07-11) — mockup.html (ferramenta #39, 16ª visual). **Sem fotos, sem IA**: 5 cenas 100% vetoriais-procedurais na paleta (Poster emoldurado na parede, Camiseta com dobras, Phone com notch e reflexo, Cartão na mesa com verso teal+ponto dourado, Outdoor com estrutura e pôr-do-sol). **Perspectiva REAL**: homografia unit-square→quad + malha de triângulos afins (drawImageToQuad, sub 12-14, triângulos com pad 1.2% pra esconder emendas; PEGADINHA: fundo claro atrás do mesh obrigatório — as bordas AA dos triângulos deixam vazar o que está atrás, contra moldura ink viravam hairlines). Controles: Fit cover/contain + Zoom, Angle (rotação/perspectiva por cena), Surface/Accent colors, Shadows/Glow procedurais, grain. Upload/drag&drop/⌘V, demo poster brand. Export PNG + PNG 2× (re-render, não upscale). 5 presets. test-mockup.mjs 10/10 (homografia erro 1e-14, perspectiva não-afim confirmada, cenas/presets distintos).

#### 11.5 — Mockup AI (pedido do Daniel 11/07: "o mockup procedural tá tosco; capítulo à parte")
- Referência: ~/PROJETOS/projeto x/brand-forge — screenshot do canvas + prompt → API de imagem (OpenAI images), com **BYO key** (chave do usuário tem prioridade; NUNCA usar chave do Daniel — regra absoluta do CLAUDE.md)
- Para a Tipó (site estático): chamada client-side direto da API com a chave do usuário (Gemini/Nano Banana aceita CORS de browser) OU Vercel serverless function com rate limit como no brand-forge
- Fluxo: arte da ferramenta (qualquer uma, via "Send to Mockup"?) + cena escolhida + prompt → mockup fotorrealista
- O mockup.html procedural vira o modo "offline/free" e o AI o modo premium
- **Status:** [ ] Conceito — decidir arquitetura de API com Daniel (chave, custos, hosting)

#### 11.4 — Gradient Shaper (referência: reel @antoncreations, pedido do Daniel 2026-07-03)
- Referência: https://www.instagram.com/reels/DZ45So6sjym/ — ferramenta de arte com gradientes do Anton (@antoncreations), single HTML file (mesmo espírito da Tipó)
- Conceito do reel: "I can make whatever shape I want and use it as a gradient. I have full control over midtones, colours, details, grid space, and sizes"
- **Qualquer forma vira gradiente**: a imagem/vídeo/webcam é a fonte, e formas custom (desenhadas ou escolhidas) são preenchidas com gradientes derivados das cores/luminância da fonte
- Controles: shape (formas prontas + desenhada), midtones (curva/pivot dos tons médios), cores (remap tipo gradient map mas por forma), detail (resolução do campo), grid space e sizes (grade de células de gradiente)
- Fontes: imagem, vídeo e webcam (pipeline igual às visual tools existentes)
- Sinergia interna: reusar LUT/stops do gradientmap.html + grid infra do reticula/pattern; possivelmente extrair um campo de gradientes suaves por célula (visual "gradient blur grid" das demos da Dinamo)
- Exports: PNG, MP4/GIF; explorar SVG se as formas forem vetoriais
- **Status:** ❌ REMOVIDO a pedido do Daniel (2026-07-11, "pode excluir") — shaper.html e test-shaper.mjs deletados, card/ticker/contagem/help limpos. Site volta a 38 ferramentas. O conceito SDF vive na aura da hero.

---


### FASE 14 — REPAGINADA TIPOGRÁFICA (pedido do Daniel 11/07: "a fonte tá sem graça, fontes mais modernas, opções de escolher")

#### 14.1 — Biblioteca de fontes + novo default ✅ (2026-07-11)
- [x] 6 fontes curadas self-hosted (licenças livres): **Clash Display Semibold** (novo DEFAULT — "geometric com presença", Fontshare ITF-FFL), General Sans Semibold, Space Grotesk Bold, Boska Bold, **Fraunces Black** (OFL, instanciada da variable com fonttools: wght 900/opsz 144), IBM Plex Mono (legado).
- [x] **TipoFont v2**: select de biblioteca no font row de TODAS as ferramentas; troca ao vivo (p5 loadFont + textFont global + evento tipofont; canvas-2D via FontFace "TipoBuiltinFont"); **persistência site-wide** (localStorage tipo-font) — escolheu uma vez, vale em todas; upload custom continua por cima.
- [x] Fontes comerciais da referência (Söhne, Canela, Reckless, Obviously, Acne, Tobias, Fenul) NÃO entraram — sem licença pra self-host. Se Daniel comprar licenças, é só dropar o arquivo em assets/fonts/ e adicionar no BUILTINS.
- UI do site continua IBM Plex Mono (voz da marca); a biblioteca muda o TYPE das ferramentas.

#### 14.2 — Refinamentos pendentes — ✅ (2026-07-13)
- ✅ **Pesos alternativos por fonte**: Clash Display (Regular/Medium/Semibold/Bold), General Sans (idem), Boska (Regular/Bold/Black), IBM Plex Mono (Regular/Bold) — baixados do Fontshare (zips oficiais) e google/fonts. Select de peso ao lado do de família (some quando a família tem 1 peso — Space Grotesk, Fraunces); peso persistido POR FAMÍLIA (`tipo-font-w-<nome>`), reaplicado no load. `BUILTINS[].file` continua sendo o peso padrão (compat).
- ✅ **Preview no select**: FontFaces de preview registradas lazy (1º toque no select) e aplicadas nas `<option>` (Chrome renderiza; Safari degrada pra texto plano) + o próprio select renderiza na família ativa. Smoke 7/7.




### FASE 18 — TIMELINE DIDÁTICA (feedback do Daniel 12/07: "os keyframes são um mistério, parece maquiagem")
Diagnóstico: o modelo "mover playhead + mexer slider = keyframe" (padrão Cavalry/AE) é INVISÍVEL pra quem não conhece esses apps. Play/REC "não fazem nada" sem ≥2 keyframes — os hints de 03/07 não bastaram.
- ✅ Opção A: **botão "✨ demo"** na barra (2026-07-13) — executa o fluxo REAL na frente do usuário em 5s: playhead no 0 + mexe um slider visível (a linha destaca em gold) = ◆, playhead pro meio + mexe de novo = 2º ◆, play — com narração passo a passo na linha de hint ("demo 1/3…2/3…3/3 — your turn"). Botão PULSA em gold enquanto não há keyframes (chama atenção exatamente de quem precisa).
- ✅ Opção C: **empty-state fantasma** na área de tracks — linha "no keyframes" com lane tracejada dizendo "move any slider → a ◆ lands here at the playhead time". Some ao primeiro keyframe, volta no Clear all.
- ~~Opção B (help ?)~~ e ~~Opção D (remover)~~ — desnecessárias com A+C.
- **Status:** ✅ Implementado (2026-07-13) — smoke 8/8: ghost row, pulse, demo cria 2 ◆ + play, estados alternam certo, zero pageerrors

### FASE 17 — MODERNIZAÇÃO DE FERRAMENTAS (pedido do Daniel 11/07)
- ✅ **ASCII** (2026-07-12) — modernização completa: **edge detection Sobel com caracteres direcionais |/-\\** (o look ASCII moderno — threshold (105-strength)/100 sobre luma cru do grid), charsets novos (Detail 70 níveis, Dots ·:°•, Digits/data), color modes novos (**Duotone** com par de cores, **Athos** — rampa da paleta por brilho), **Cell Fill** (mosaico: célula pintada + glifo knockout na cor do fundo), fine tuning (brightness/gamma/saturation/**flicker** temporal pra vídeo), **Copy TXT** (clipboard com fallback download), **Export HQ** via takeover p5 (9ª ferramenta da suíte, test-hq 42/42). 8 presets novos: Classic/Detail/Edge/Duotone/Matrix/Athos/Mosaic/Poster. Fixes de raiz: braille/katakana eram TOFU (p5 renderiza paths opentype sem fallback — glifo fora da Plex Mono = .notdef; removidos, charsets agora só com glifos verificados via charToGlyphIndex), blocks com calhas verticais (advance 0.6em — auto-size ×1.7), e **wake(ms)**: imagem estática congela no noLoop e nunca via o morph de 300ms do applyPreset — agora o loop fica vivo pela janela do morph (bug pré-existente).
- ✅ **Overlays** (2026-07-12) — diagnóstico do "tosco": o tool compositava UMA textura estática com blend mode; filme real é CAMADAS ANIMADAS. Novo sistema **Film FX** (seção própria): **Flicker** (variação de exposição por frame), **Gate Weave** (frame dança no gate, bordas viram preto de projeção), **Vignette** (curva 3-stop), **Dust & Hair** (poeira efêmera + fio de cabelo no gate + risco vertical persistente), **Tint** (banho de cor soft-light). Tudo steppado a **18fps** como projeção real, com hash de tempo próprio (determinístico — preview e HQ reproduzem a mesma sequência). Presets de filme viraram looks completos: Super 8 = long-grain + flicker 45/weave 40/vignette 55/dust 45/tint gold; Kodak e VHS idem proporcionais. **Export HQ** (10ª da suíte): renderFullRes compartilhado entre PNG e HQ com **K = W/previewRw** escalando textura e artefatos (senão o grão sai relativamente mais fino em 4K — o PNG ganhou essa paridade também), grão re-gerado deterministicamente por step de 15fps a partir do seed capturado no begin. Smoke 19/19, risco vertical e poeira visíveis no frame HQ extraído.
- ✅ **Depth** (2026-07-12) — o material era flat (textura + shading difuso fake); upgrade de shader: **Specular** (Blinn-Phong das normais do depth — material molhado/metálico), **Rim Light colorido** (pow(1-n.z) — contorno que faz o relevo POPAR), **Fog por profundidade** (longe some na cor — atmosfera cinematográfica), **Light Angle** (0-360°). Novo render mode **Particles** (THREE.Points com o MESMO shader via define POINTS — gl_PointSize por distância, discard circular, uniforms compartilhados entre os 2 materiais) — o look "depth portrait" de nuvem de pontos. Wireframe checkbox → select Solid/Wireframe/Particles. Presets agora incluem cores (rim/fog/bg) e viram looks completos; 2 novos: **Particles** (nuvem mint com fog, meshRes 170 pra os pontos respirarem) e **Neon** (specular 60 + rim gold 85 + fog — embossed dramático). test-depth atualizado: 8/8 presets distintos, modo particles verificado, tudo OK.
- **Status:** ✅ FASE 17 COMPLETA — ASCII + Overlays + Depth modernizados (2026-07-12)

### FASE 16 — EXPORT HQ: suíte de efeitos visuais para takes (pedido do Daniel 11/07)

Visão: as visual tools viram uma suíte de VFX pra montagem — o take entra em 4K, sai em 4K com o efeito, frame-perfect, pronto pro corte.

**Por que hoje sai menor**: tudo é realtime — as ferramentas processam vídeo em buffer capado (ex. gradientmap 860px) pra rodar a 30fps ao vivo, e o TipoRecorder captura o canvas da tela com encode capado em classe 1080p. Refém do relógio.

**Arquitetura (render offline, como um NLE)**:
- **shared/hq.js — TipoHQ**: loop de seek frame-exato no vídeo fonte (currentTime + seeked; v2: WebCodecs VideoDecoder pra velocidade) → renderiza o efeito em resolução NATIVA num canvas offscreen → VideoEncoder com timestamp = i × 1e6/fps → mp4-muxer. Sem realtime = sem trava; cada frame demora o que precisar (barra de progresso).
- **Contrato por ferramenta**: expor `renderFrameHQ(frame, timeSec, ctx, W, H)` — o pipeline de frame como função pura, sem o cap do preview e com tempo VIRTUAL (animações drift/cycle ficam suaves e determinísticas).
- Encoder: dims da fonte, codec ladder (avc1 High 5.1/5.2 pra 4K → fallback 1440/1080 se isConfigSupported negar), bitrate escalado por pixel. HW encode do Chrome segura 4K.
- Bônus dos temporais: datamosh/rastro ficam MAIS corretos offline (sequencial garantido, echo sem drops).
- UI: botão "Export HQ" + opções (resolução fonte/1080/720, fps fonte/24/30) + progresso com frame count + cancelar. Mobile: share sheet no final.
- **Áudio**: v2 — remux da trilha original (decode + AudioEncoder AAC ou cópia de track). V1 exporta vídeo mudo (montagem geralmente re-linka áudio).

**Rollout**:
- 16.1 Motor TipoHQ + 2 pilotos (gradientmap + riso) — ✅ (2026-07-11) **shared/hq.js**: seek-loop frame-exato → render full-res offscreen → VideoEncoder timestamps i×1e6/fps → mp4-muxer fastStart; codec ladder (High 5.1 pra >1080p, fallback 1440→1080 via isConfigSupported), bitrate 0.12 bits/px/frame cap 40Mbps, backpressure na fila, progresso com fps/ETA + cancelar, restaura estado do player. Botão "Export HQ" injetado ao lado do Record (só ativa com vídeo). Pilotos: gradientmap (renderFrameHQ com tempo VIRTUAL pro cycle — anda por segundos do take) e riso (renderRiso já parametrizado; currentOpts(mult) escala cell/misreg pra resolução alvo — halftone mantém o tamanho visual do preview em full-res). **test-hq.mjs 13/13: 1080p→1080p exato, 75/75 frames, duração 2.50s exata, decode limpo, e 1440p exporta NATIVO.** Frame extraído confirma o efeito em full-res.
- **Ordem do rollout definida pelo Daniel**: Dithering, Reticula, Glitch, Datamosh, Rastro, Pixel Sort (+ os 2 pilotos prontos = as 8 mais úteis)
- 16.2 Rollout frame-based — ✅ parcial (2026-07-12): **pixelsort** (renderFrameHQ auto-contido, drift em tempo virtual, os 3 caminhos de ângulo) e **dithering** (takeover: hqCellSize = W/cols — o grid da arte fica IDÊNTICO ao preview, células nítidas em full-res; gate no loop ao vivo). **reticula e glitch** ✅ (2026-07-12) via **takeover p5**: noLoop() (pausa o loop ao vivo de graça) + resizeCanvas(W,H) + redraw() por frame roda o draw() REAL em resolução nativa; parâmetros em pixels escalam por hqK = W/previewW (glitch: 8 params; reticula: gap) — a ESTÉTICA fica idêntica ao preview, nítida. **SUÍTE COMPLETA: 8/8 ferramentas da lista do Daniel exportam em resolução de fonte, test-hq 37/37.**
- 16.3 Temporais — ✅ (2026-07-12): **datamosh e rastro via "HQ takeover"** — hqSize força o pipeline REAL nas dimensões da fonte, begin() reseta buffers/keyframe, tempo virtual em ms, e flag global `__tipoHQactive` PAUSA o loop ao vivo (senão o estado temporal avançava dobrado). Sequencial garantido = mosh/echo mais corretos que o preview. Engine ganhou hooks begin/end e aceita recordBtn como âncora (dithering).
- 16.4 Áudio remux — ✅ (2026-07-13): **o Export HQ agora sai COM o áudio do fonte**. Pipeline: fetch do blob do vídeo → `decodeAudioData` (decodifica a trilha do container) → `AudioEncoder` AAC 128k (fallback Opus se a plataforma não encodar AAC; sem trilha/falha = exporta mudo como antes, com warn no console) → chunks no mp4-muxer (track de áudio declarada só quando existe). AudioData f32-planar em frames de 1024 samples, timestamps µs, backpressure na fila. Validado: fonte com sine 440Hz → saída AAC 48kHz, duração 2.58s≈vídeo, decode A+V limpo, volume -17.7dB (sinal real); fonte sem áudio → mudo sem quebrar. Vale pras 10 ferramentas com HQ automaticamente (é no engine). Presets de entrega (PNG sequence etc.) ficam pra depois se o Daniel pedir.
- 16.5 **Performance capture** — ✅ (2026-07-13): durante o Record MP4 ao vivo, o TipoHQ loga a AUTOMAÇÃO DE SLIDERS (input isTrusted em range com id) e EVENTOS DA FERRAMENTA (datamosh: dropKeyframe → `TipoHQ.perfEvent('keyframe')`, slider e botão e clique no canvas) — tudo com **timestamp do vídeo** (`video.currentTime`, então funciona através de loops do take). No stop: toast + **chip "✦ Performance (N ev) ON/OFF"** ao lado do Export HQ. Na passada HQ: snapshot dos sliders atuais → aplica o ESTADO INICIAL do take → replay dos eventos em `ev.t <= t` frame a frame (sliders re-setados + `cfg.perfEvent(name)` pro tool re-executar o drop) → restaura o estado pós-performance no finally. Mecânica: ui.js dispara `tipo-rec-start/stop` (CustomEvent) nos DOIS caminhos de gravação (toggleRec e toggleVisualRec). Validado end-to-end no datamosh: 8 eventos (drag real + 2 drops), 2 drops reaplicados na passada, sliders restaurados, saída na resolução fonte, decode limpo. Nota: dithering tem sistema de gravação próprio (não passa pelo TipoUI) — perf capture não cobre ele por ora.
- 16.6 **Record → HQ como default** — ✅ (2026-07-15, feedback do Daniel: "tudo que for recording precisa sair em HQ — o recording ficou em desuso"): **parou a gravação com fonte de vídeo = o arquivo final JÁ SAI da passada HQ com a performance reaplicada** (perf.use liga automático). A gravação ao vivo vira fallback: cancelou o render ou falhou → baixa ela ("mantendo a gravação ao vivo"). Overlay do render com título "Render HQ da sua take". Exceções que seguem no fluxo ao vivo: ferramentas sem vídeo (kinetic/webcam/imagem) e o REC da timeline (flag `_tlPass` — duração/automação próprias). Guard: não deixa iniciar Record durante um render HQ. Mecânica: `TipoHQ.deliverRecording(liveResult)` chamado nos DOIS caminhos de stop (toggleRec/toggleVisualRec), com o `tipo-rec-stop` disparado ANTES da entrega (fecha a captura de performance). Validado e2e: datamosh grava+performa → stop → download automático é o -HQ 1920×1080; field (kinetic) e timeline REC inalterados.
- **Status:** ✅ FASE 16 COMPLETA (16.1–16.6) — suíte HQ com 10 ferramentas, áudio, performance capture, Record→HQ unificado

### FASE 15 — HERO SECTION (pedido do Daniel 11/07: "algo bem fodão com GSAP, imersivo, palinha do que vem a seguir")
- Uma abertura imersiva ANTES da home: primeira impressão do site
- GSAP para coreografia (regra da casa: GSAP = orquestração, CSS = loops ambientes)
- Deve dar "palinha" das ferramentas: type cinético + efeitos visuais reais (reusar engines? HeaderFX ampliado? cenas em sequência com scroll ou auto-play?)
- Direção a definir com squads (design-squad + dev-squad) como no Header v3 — é um capítulo de identidade, não só uma seção
- Skip/entrar direto obrigatório (respeitar retorno de usuário; localStorage "já vi")
- **Status:** ✅ Implementado (2026-07-11) — **"O ENSAIO"**: o ponto dourado é o maestro — abre o show, imprime cada letra com uma ferramenta da casa (**T dither** flicker steps, **I glitch** com fringes mint/gold + jitter, **P coil** rolando de -420°, **Ó crash** bounce+squash com anel de **badge** orbitando), a palavra faz a onda do **field**, a aura do **Shaper** floresce atrás (anéis rounded-rect canvas 30fps, cores brand hairline), e o ponto estaciona como a assinatura TIPÓ•. Log de máquina em Plex Mono narra cada passe ("ensaio 01 · dither"...). GSAP timeline (coreografia) + CSS (parked: respiração das letras + pulso do ponto). Saída: scroll/swipe/Enter/CTA — letras voam, hero sobe, home revela. **1× por sessão** (sessionStorage), deep-links #hash e prefers-reduced-motion pulam direto, skip sempre visível. Clash Display via @font-face; rects medidos após document.fonts.ready e ANTES dos transforms iniciais (senão o Ó a -120vh distorce os alvos do ponto). Dark theme próprio. Zero pageerrors, testado desktop + iPhone (swipe exit) + dark.

### FASE 13 — MOBILE (pedido do Daniel 2026-07-03: "não tá funcionando bem no celular")

Diagnóstico do Daniel: a experiência mobile atual é ruim. A direção NÃO é adaptar as 37 ferramentas — é **curadoria**: as melhores ferramentas (especialmente as visuals) e as principais kinetics, com parâmetros simplificados e UX pensada pra celular de ponta a ponta.

#### 13.1 — Auditoria mobile + curadoria
- Testar as 37 no viewport mobile real (touch, painel, canvas, performance) e mapear o que quebra
- Escolher o line-up mobile: visuals fortes (dithering, riso, glitch, pixelsort, gradientmap, palette, pattern, overlay...) + kinetics principais (coil, cascade, flag...) — decidir COM o Daniel
- Ferramentas fora do line-up: banner "melhor no desktop" em vez de experiência quebrada
- **Status:** ✅ Auditoria feita (2026-07-04) — CAUSA RAIZ do "mobile não funciona": o CSS esperava um `.tipo-panel-toggle` que NUNCA foi criado em JS — o painel ficava fora da tela sem jeito de abrir; as 38 ferramentas eram incontroláveis no celular. Canvas dos p5 ficava 290px (resize antes do p5 bootar). Curadoria do line-up: PENDENTE decisão com Daniel (mas com o bottom sheet todas ficaram usáveis — a curadoria vira refinamento, não gate).

#### 13.2 — UX mobile: painel e controles
- Painel vira bottom sheet (arrasta pra abrir/fechar), canvas em cima — não sidebar espremida
- **Parâmetros simplificados**: por ferramenta, expor só os 4-6 sliders que importam + presets em destaque (presets primeiro, sliders depois — no celular preset É o fluxo principal)
- Touch: sliders maiores (44px+ de alvo), sem hover-dependência (tooltips ? viram tap, lens/brush do mouse ganham equivalente touch), dblclick vira double-tap
- Upload: câmera direto (capture attribute), galeria, paste
- **Status:** ✅ Fundação implementada (2026-07-04) — **TipoMobile** (ui.js) + sheet CSS (style.css @media 768px): painel vira **bottom sheet** com grip "Ajustes" (54px peek), tap abre/fecha, **drag segue o dedo** e snap no release (pointer capture). **Presets promovidos pro topo** (fluxo preset-first), **todas as seções colapsáveis** (fecham por default exceto Text/Presets/Export — simplificação universal sem curadoria por ferramenta). Touch: btn 44px, chips 10px padding, range 30px/thumb 22px, text input 16px (mata zoom do iOS), toasts acima do peek. dithering (não migrado pro shared css) ganhou cópia local do bloco. Refit do canvas: resize re-disparado em 600/1500ms + load (p5 boota depois do DOMContentLoaded). test-mobile.mjs: **38/38 PASS** (grip, tap open/close, colapso, canvas full-width, 0 pageerrors). Pendente: essenciais 4-6 por ferramenta (curadoria com Daniel), capture attribute no upload, double-tap.

#### 13.3 — Formatos e redes sociais
- Presets de formato de export: **9:16 (Stories/Reels/TikTok), 1:1, 4:5 (feed), 16:9** — o canvas enquadra no formato escolhido
- Export MP4/GIF já otimizado pros limites das redes (duração/tamanho)
- **Web Share API**: botão compartilhar nativo (share sheet do iOS/Android) com o arquivo direto pra IG/WhatsApp/etc — no mobile isso substitui o download
- **Status:** ✅ Implementado (2026-07-04) — **TipoFormat** (ui.js): pill flutuante cicla FREE → 9:16 → 1:1 → 4:5 → 16:9. Estratégia universal: letterbox no CONTAINER do canvas — todas as ferramentas leem o tamanho do container e re-fitam no resize, então preview, PNG, MP4 e GIF saem no aspect escolhido sem tocar em nenhuma ferramenta. E2E validado: MP4 gravado em 1:1 sai 780×780 (ffmpeg). **Web Share**: TipoUI._downloadBlob virou funil deliver — no mobile com canShare, TODO export (PNG/MP4/GIF/ASE/SVG/CSS/JSON) mostra barra [Compartilhar][Baixar]; Compartilhar abre o share sheet nativo (navigator.share com o File, dentro do gesto do toque), Baixar mantém o download. TipoRecorder.download roteado no boot quando mobile. test-format-share.mjs 7/7 PASS. Pendente: caps de duração por rede (GIF já capado em 3s).

#### 13.4 — Landing mobile
- Header/index adaptados (HeaderFX tem mouse-lens e hover — precisa de fallback touch), cards em lista, line-up mobile em destaque
- PWA leve? (add to home screen, ícone, fullscreen standalone) — avaliar custo/benefício
- **Status:** ✅ Implementado (2026-07-04) — media query no index.html: split panels EMPILHADOS (antes 2 colunas de 195px quebravam "VISUAL T/OOLS" no meio da palavra), títulos 21px nowrap, subs com padding, header decluttered (stats e fxLabel escondidos no mobile — sobra logo + breadcrumb + HeaderFX que já roda em touch: tap no header dispara a passada). Lista de cards com padding 16px. **PWA: adiado deliberadamente** — custo (manifest + ícones + service worker + gestão de cache que conflita com o cache-bust manual) não paga o benefício agora; revisitar se o uso mobile crescer. Screenshots home + categoria conferidos no iPhone viewport.

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
| **Dither Boy** | ditherboy.com | 73 algoritmos dithering, pipeline 9 efeitos, 82 paletas, CMYK halftone, Epsilon Glow, Electron desktop app | Tipó é web (zero install), tem video+webcam, kinetic type, Risograph (exclusivo), grátis |

### Features Exclusivas do Tipó (ninguém mais tem)
1. **Visual Tools + Kinetic Type** na mesma plataforma
2. **Video + Webcam** como source em todas as ferramentas
3. **MP4 recording nativo** (sem ffmpeg, sem servidor)
4. **Overlay Generator** procedural seamless (substitui packs pagos)
5. **27 ferramentas** em HTML puro sem build tools
6. **Risograph simulator** no browser ✅ (riso.html — Fase 8.6)
7. **Zero install** — 100% web, não precisa baixar app desktop
8. **Easing curves profissionais** com 10 curvas + 3 direções em todos os modos
9. **Mouse interaction** reativa em modos kinetic type

### Features que a concorrência tem e o Tipó não
1. Font engine vetorial (STG) → **Fase 10**
2. GIF export loop → **Fase 12.2**
3. Custom font upload → **Fase 12.1**
4. Mouse interaction → **Fase 7.2** ✅ (implementado em Field, Danger, Pow)
5. Share via URL → **Fase 12.3**
6. Image → 3D depth mesh → **Fase 8.10**
7. 73 algoritmos de dithering (Dither Boy) → **Fase 8.2/8.3** (implementar via papers públicos)
8. Pipeline de efeitos encadeado (Dither Boy) → **Fase 8.1**
9. CMYK Halftone profissional (Dither Boy) → **Fase 8.4**
10. Risograph → **Fase 8.6** (EXCLUSIVO TIPÓ — ninguém tem)

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
