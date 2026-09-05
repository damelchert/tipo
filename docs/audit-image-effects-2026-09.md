# Imagem & Efeitos — auditoria de uso em vídeo

5 de setembro de 2026 · 18 ferramentas · implementação e testes em navegador.

## Resultado

O upload deixa de produzir uma miniatura solta no workspace. Os filtros abrem preenchendo a área de trabalho, com proporção preservada e os controles visíveis. **Preencher recorta a visualização quando o vídeo e a tela têm proporções diferentes; Ajustar mostra o quadro inteiro.** Não é a tela cheia do navegador, nem aumento artificial da resolução de exportação.

Além da interface, foram corrigidos erros de renderização, aleatoriedade involuntária, perda de fonte ao trocar preset e divergências entre preview e arquivo. Nenhuma ferramenta inteira foi removida: foram retiradas receitas sem utilidade clara e uma operação que entregava resultado incorreto passou a ser bloqueada explicitamente.

## Enquadramento

- Dithering, Riso, Gradient Map, Pixel Sort, Datamosh, Rastro e Depth usam o mesmo componente de preview. Ele amplia automaticamente, acompanha upload/troca de fonte/resize/mobile e oferece Preencher/Ajustar. O tamanho do canvas de processamento não é alterado por esse zoom.
- ASCII já ocupa o palco; agora faz recorte central sem deformar a fonte. Retícula, Glitch e Overlay oferecem Preencher/Ajustar na fonte e abrem em Preencher. Nesses motores o enquadramento pertence ao palco, e o HQ nativo usa a proporção da fonte.
- ASCII, Retícula, Glitch e AudioType também corrigem a medição do canvas no boot: o elemento temporário do p5 ocupava 100px da linha flex antes de ser movido para o workspace, deixando uma faixa vazia à direita.
- Dithering separa claramente **resolução de saída**, densidade da malha e **recorte de saída**. Original, 1:1, 9:16, 4:5 e 16:9 são aplicados ao render; o HQ respeita o recorte escolhido.
- Nas sete ferramentas de canvas dimensionado pela fonte, a antiga pílula Formato foi substituída pelo controle de preview: mudar só o retângulo HTML não mudava o formato do arquivo, apesar da promessa anterior. A pílula de formatos permanece nos motores que redimensionam o palco.
- Studio mantém composição de múltiplos frames; Mockup mantém a cena; Palette mantém a prancha; Fotograma mantém a galeria. Pattern não recebe vídeo. AudioType recebe imagem + áudio, não vídeo. Video Depth Map já tem monitor principal de upload e conserva seu fluxo de análise. Não foram convertidos artificialmente em filtros full-bleed.

## Auditoria por ferramenta

| Ferramenta | Correção / decisão | Uso e limite relevante |
| --- | --- | --- |
| Dithering | Presets Tonal, Print, Scanlines e Duotone completos; malha mais detalhada; Bayer sem alterar preto/branco puros; SVG guarda as formas reais, inclusive uploads não quadrados; fonte protegida durante exportação | Acabamento gráfico de sete níveis. SVG avisa e não exporta silenciosamente sem glow/tint; para esses efeitos usar PNG/MP4. Formas experimentais ficam recolhidas. |
| ASCII | Proporção correta; glifos mono sem atenuação dupla; Data substitui a receita Matrix piscante; flicker manual por timestamp | Textura tipográfica. Sem promessa de reprodução fotográfica; recorte do palco pode diferir do HQ nativo. |
| Retícula | Line/Ring visíveis, malha gira sem girar a fotografia, pré-filtragem e cobertura tonal melhores; Emoji removido | Impressão/pontos/linhas. Inspecionar moiré no tamanho final. |
| Riso | Editorial inicial, grão/registro moderados; HQ não multiplica ângulo nem muda escala relativa do grão | Simulação visual RGB, não separação/prova ICC de impressão. |
| Gradient Map | Tonal inicial a 30%; cores não ciclam automaticamente; relógio por tempo de vídeo | Tratamento de luminância/cor. PNG ainda usa resolução de preview; vídeo HQ é nativo. |
| Glitch | Recombinação RGB sem superexposição; presets atômicos; ruído temporal repetível; porcentagens sem escala duplicada; PNG nativo | Interferência digital controlada. Faixas extremas continuam manuais. |
| Pixel Sort | Máscara estável, drift por tempo da fonte, buffers limpos e PNG nativo; presets com mix/span menores | Ordenação seletiva de pixels, não reconstrução de imagem. |
| Datamosh | Amount 0 como bypass; buffers limpos em novo take/loop; jitter repetível e recuperação menos agressiva | Simulação de motion vectors, não corrupção real de codec. **HQ com Vídeo B bloqueado**: gravar Cross-Mosh ao vivo até haver sincronização offline dupla. |
| Rastro | Ecos amostrados por tempo; PNG não adiciona eco; HQ completo sem guias; limite de memória temporal 512 MiB | Exige máscara para isolar sujeito. Alpha não é remoção automática de fundo. PNG representa o histórico atual. |
| Overlay | Grão/cadência estáveis entre passadas; gate com overscan; Film Fine sem alegação de película calibrada | Textura procedural; intensidade/flicker/poeira mais contidos. |
| AudioType | Imagem não some ao aplicar preset; proporção preservada; entrada Mono; MP4 recebe áudio do analisador real | Visualizador de imagem/texto + áudio. Microfone físico não foi testado. |
| Studio | Controles maiores; modal de ferramentas por teclado; Delete não apaga frame atrás do modal | Compositor com 20 efeitos e oito receitas. Preserva canvas infinito e resolução interativa limitada. |
| Pattern | SVG de texto com XML válido e símbolos preservados | Padrões/tiles e animação procedural. Texto SVG exige a fonte no aplicativo de destino; não é convertido em contornos. |
| Palette | Menos cópias de fotos grandes; erro de decode visível; reset determinístico; última escolha vence | Extração de cores de imagem estática, não filtro de vídeo. PNG é a prancha. |
| Mockup | Object URLs liberados; erros visíveis; uploads concorrentes não trocam a arte errada | Cenas ilustradas, não fotografia. Export 2× não recupera detalhe além do buffer da arte. |
| Depth | Inferência atrasada não se aplica à imagem substituída; distinção Luminance/AI explícita | Relevo/parallax. Luminance não mede distância física; AI captura um frame. |
| Video Depth Map | Revalidado upload principal, presets, source lock, cancelamento e MP4 automático | Neural por frame, com limites de amostras/memória. Inferência substituída por fixture nesta rodada; processamento e codec reais. |
| Fotograma | Regressão da navegação, prompts, snapshots e galeria; nenhuma mudança de conta/provider | Geração semântica e contas não certificadas nesta rodada. Vídeo → GIF mantém workspace próprio e galeria preservada. |

## Evidências reproduzíveis

- `node test-visual-framing.mjs`: **84/84 checks** de upload horizontal/vertical, troca vídeo→imagem, proporção, Preencher/Ajustar, resize, mobile iniciado em 390px, painel aberto, botões sem sobreposição, SVG decodificado vs pixels e corrida de permissão de webcam. Câmera sintética, não câmera física.
- `node test-visual-framing.mjs --dither-only --full-hd`: Dithering MP4 H.264 **1920×1080/30 frames** e crop **1080×1080**, decodificados integralmente.
- `node test-visual-tonal-quality.mjs --full-hd`: **73/73 checks**, ASCII/Retícula/Riso/Gradient Map, todos os 33 presets, estabilidade e arquivos reais; quatro MP4 H.264 **1920×1080/15 frames**.
- `node test-visual-motion-quality.mjs --full-hd`: **67/67 checks**, cinco filtros, todos os 39 presets, PNGs reais e cinco MP4 H.264 **1920×1080/15 frames**; duas passadas HQ comparadas pixel a pixel.
- `node test-visual-workspace-quality.mjs`: **8/8 workspaces**, arquivos reais, proporção, teclado, XML, uploads inválidos e MP4 AudioType com áudio não silencioso.
- `node test-platform-smoke.mjs --tools=studio,dithering,pattern,depthmap,reticula,glitch,riso,rastro,datamosh,pixelsort,gradientmap,palette,depth,mockup,overlay,ascii,audiotype --all-presets`: **34/34** cenários desktop/mobile na primeira integração.
- Regressões: Studio, Palette, Pattern, Mockup, Depth Map, Rastro, Dithering engine, formatos/MP4 quadrado, upload mobile, Fotograma audit, home **28 checks** e prévias cinéticas **38 checks**.
- Integração final com cache renovado: `node test-platform-smoke.mjs` passou **80/80 cenários** nas 40 ferramentas independentes (desktop/mobile); Fotograma validado separadamente. Vídeo → GIF passou **32/32 checks**, sem chamadas de geração.

Os testes usam arquivos locais/sintéticos e downloads efetivos. PNGs, SVGs e MP4s são abertos/decodificados, não só contados como botões existentes. Fotografias de demonstração e capturas de UI também foram inspecionadas. Nada foi gerado em conta paga, e nenhum arquivo da galeria pessoal foi alterado.

## O que significa “profissional” nesta entrega

Significa um ponto de partida mais controlado, geometria preservada, efeito reproduzível e exportação verificada — **não certificação de mastering**. Os dez filtros com HQ foram exercitados em Full HD, mas com takes curtos. Não é benchmark de clipes longos, 4K, toda GPU ou hardware mobile.

O pipeline atual é Canvas/SDR/8-bit e os exports HQ usam H.264 a 30 fps. Não oferece master ProRes/EXR/HDR, 10/16-bit, FPS original garantido, ACES ou controle de cor ICC. Para finalizar um trabalho, confira compressão, duração, cadência, cor e legibilidade do efeito no editor de vídeo e na resolução de entrega. Preserve os originais.

Detalhes: [tonal](audit-visual-tonal-2026-09.md), [motion](audit-visual-motion-2026-09.md), [workspaces](audit-visual-workspaces-2026-09.md). Os squads de desenvolvimento e design orientaram a separação entre zoom/render/export, a curadoria dos presets e a revisão independente dos bugs — sem reformular a identidade Tipó nem esconder limitações.
