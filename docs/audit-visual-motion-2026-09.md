# Auditoria de motion — Imagem & Efeitos

Data: 2026-09-05. Escopo: Glitch, Datamosh, Pixel Sort, Rastro e Overlay. Trabalho local, sem APIs de IA ou alteração de arquivos do usuário.

## Decisões e correções

| Ferramenta | Falha confirmada | Correção / direção de preset |
|---|---|---|
| Glitch | `frameCount` e RNG livre mudavam o resultado do mesmo take. Morph dos sliders de preset também mudava parâmetros durante um export imediato. RGB Split somava cópias RGB à fonte e superexpunha a imagem. Parâmetros percentuais eram escalados duas vezes no HQ. | Padrão repetível por timestamp da fonte; Speed 0 realmente congela; presets atômicos. RGB por recombinação de canais, percentuais sem escala duplicada. Subtle inicial, cortes/corrupção/estática moderados. Signal Break, Block Drift e Digital Cut substituem nomes e combinações mais destrutivas. PNG agora na resolução da fonte, sem borda do workspace. |
| Datamosh | Reset limpava `grayPrev`, mas o passo seguinte reutilizava `grayCur` antigo; primeiro frame de novo take herdava movimento anterior. RNG livre, estado persistindo no loop do vídeo, Amount 0 não era bypass. Vídeo B rodava livre durante HQ. | Limpa os dois buffers, reinicia em salto/loop, jitter determinístico por frame, Amount 0 mostra a fonte. Presets com recuperação e menos iterações/jitter, Subtle Drift inicial. HQ com Vídeo B explicitamente bloqueado; Record MP4 continua disponível. |
| Pixel Sort | Quebras aleatórias trocavam a cada render/PNG. Drift era incrementado por chamada, não por tempo da fonte. PNG exportava a resolução reduzida do preview; rotação podia acumular pixels transparentes antigos. | Máscara espacial fixa, drift por timestamp, limpeza dos buffers, PNG nativo pelo mesmo pipeline do HQ. Mix e Max Span moderados em todos os 7 presets. Subtle inicial e Prism substitui Chaos. |
| Rastro | Histórico era amostrado por chamada de render; PNG acrescentava um novo eco. HQ usava acumulador de meia resolução, relógio inicial anterior e podia desenhar guias. Contagens extremas em 4K exigiam gigabytes. | Amostragem em slots de 30 fps pelo tempo do vídeo; PNG recompõe sem avançar histórico; restart em loop/salto. HQ usa acumulador completo, reinicia relógio e oculta guias. Alocação de histórico acima de 512 MiB bloqueada com orientação para reduzir Count. Presets entre 6–12 ecos, menor opacidade/decay e exposição neutra. |
| Overlay | Seed variava por RAF; HQ iniciava do seed corrente, portanto cada passada tinha grão diferente. Upload ainda sem frame causava risco de `drawImage`; movimentação do gate revelava bordas pretas. | Mesmo seed-base e clock de fonte no preview/PNG/HQ; grão com cadência de 24 fps; guard de readiness; overscan no gate. Film Fine substitui a alegação de Kodak 400; presets reduzem grão, flicker, poeira e banho de cor. |

Nos cinco, arquivos de tipo não suportado são recusados sem apagar a fonte atual. Pixel Sort, Datamosh e Overlay tratam a rejeição esperada de `play()` quando uma fonte é substituída rapidamente. Glitch e Overlay têm seletor **Preencher** (padrão) / **Ajustar** para seu render interno: usam uma escala uniforme, preenchem o workspace e permitem ver o quadro inteiro com letterbox. PNG/HQ mantêm a resolução e a proporção original; a escala dos parâmetros/textura acompanha o tamanho real da mídia no preview. Nas ferramentas com canvas nativo, o enquadramento visual fica no módulo compartilhado.

Glitch também tinha uma faixa vazia de **100 px**: no boot, `createCanvas()` deixava temporariamente um canvas no `body` flex e media 780 px para um workspace que ficava com 880 px após `parent()`. A dimensão agora é recalculada imediatamente após o parenting; o teste compara backing/display com o workspace no boot e após upload.

## Evidências

Resultado final local: **67 verificações aprovadas** na bateria Full HD, sem erros não tratados de browser. Artefatos temporários da última passada: `tipo-motion-quality-QGlhGe`.

- `node test-visual-motion-quality.mjs`: vídeos sintéticos reais, duas passadas sequenciais HQ com comparação de pixels, MP4 e PNG baixados e decodificados por FFmpeg.
- `node test-visual-motion-quality.mjs --full-hd`: mesmo fluxo, MP4 **1920×1080 / H.264 / 30 fps / 15 frames** em cada uma das cinco ferramentas. Verifica todos os **39 presets**, troca vídeo→imagem, tipos inválidos, congelamento, recorte aleatório estável e guardas de memória/Cross-Mosh. Em Glitch/Overlay verifica pixels preenchidos do canvas, proporção preservada e letterbox opt-in em Ajustar.
- PNG de Glitch, Pixel Sort e Overlay verificado em **1200×720**, mesmo quando o preview usa menos pixels.
- `node test-rastro.mjs`: suíte anterior aprovada, incluindo operadores, máscara desenhada, motion difference, movimento de imagem, PNG Alpha e MP4 ao vivo.
- Inspeção visual com a foto de demonstração existente `assets/fotograma-demo.jpg`: Pixel Sort concentra faixas nos tons selecionados; Overlay mantém composição e altas luzes; Glitch continua propositalmente digital, mas sem ganho global de exposição. Rastro é um efeito de ecos, não um recorte automático de pessoas.

## Limites que continuam explícitos

- A repetibilidade foi verificada para a mesma sequência/resolução/configuração no mesmo navegador. Não significa identidade pixel a pixel entre preview reduzido e resolução nativa, codecs/navegadores diferentes ou uma performance de webcam.
- **Datamosh é simulação**, não corrupção de I-frames de um codec. Cross-Mosh com Vídeo B só deve ser gravado ao vivo até existir sincronização offline de ambas as fontes.
- **Rastro requer máscara apropriada** para isolar um sujeito. Fundo de câmera em movimento também deixa ecos; Alpha não é remoção automática de fundo. PNG de Rastro/Datamosh fotografa o estado temporal na resolução atual do preview; para vídeo nativo use HQ.
- **Overlay é textura procedural**, não LUT/emulação colorimétrica certificada de película. O nome Film Fine evita essa promessa.
- Este fluxo de browser é SDR/Canvas e entrega MP4 H.264 a 30 fps. Não foi validado como pipeline de conform HDR, 10/16-bit, ProRes, preservação do FPS original ou gerenciamento de cor para mastering.
- A faixa manual de efeitos fortes permanece disponível. A curadoria inicial facilita um ponto de partida controlado, mas seleção de preset, máscara e intensidade continuam dependendo do plano e da intenção de montagem.

## Quality gate

- [x] Responsabilidades pequenas e nomes claros nas novas rotinas de clock/hash/texture.
- [x] Sem novos serviços, dependências circulares ou chamadas a provedores.
- [x] Testes de comportamento e regressão para os defeitos corrigidos.
- [x] Memória temporal HQ protegida no caso mais pesado identificado.
- [x] Saídas reais verificadas, não apenas presença dos botões.
- [x] Limitações documentadas; nenhuma promessa genérica de “cinema profissional” ou emulação física.
