# Auditoria — ASCII, Retícula, Riso e Gradient Map

Data: 2026-09-05. Escopo: algoritmos, presets, estabilidade temporal, composição e exportação. Integração do enquadramento comum pertence à auditoria geral. Não foram usados serviços de IA nem alterados arquivos pessoais.

## Resultado por ferramenta

| Ferramenta | Defeito verificado | Correção e direção de uso |
| --- | --- | --- |
| ASCII | A fonte era deformada para o grid do workspace. O modo mono atenuava a luminância duas vezes: cobertura do caractere e alpha. Matrix ligava flicker aleatório; cada render/HQ podia divergir. | Cover central calculado pela proporção física do canvas; glifos mono sem segunda atenuação; primeiro preset Classic aplicado na entrada. Data substitui a receita piscante por números neutros. Flicker manual permanece, reproduzível pelo tempo do vídeo. Detail/Mosaic não aumentam a saturação automaticamente. |
| Retícula | Line e Ring herdavam `noStroke`, produzindo saídas vazias. O ângulo girava o assunto junto da malha. Amostragem pontual em alta resolução favorecia instabilidade. | Linhas/rings mantêm stroke, amostragem acompanha a posição efetiva da malha rotacionada, mantendo o assunto orientado. Pré-filtragem em resolução próxima à malha, pixel density explícito, dimensões nativas de vídeo e diâmetro proporcional à raiz da cobertura melhoram meios-tons. Busca limitada ao retângulo visível. Preencher é o enquadramento inicial, com recorte central sem deformação; Ajustar preserva o quadro inteiro. |
| Riso | Exportar maior multiplicava também o ângulo do desalinhamento e mudava a escala do grão. Os presets mais agressivos apagavam detalhe ou geravam grande separação cromática. | Ângulo independente da escala de saída; textura escala junto dos pontos. Grão determinístico e imóvel. Editorial entra primeiro (célula 6, registro 1, grão 10), novas receitas mais contidas; Offset substitui Punk, Comic sai da seleção. Controles manuais mantêm amplitude criativa. |
| Gradient Map | Athos iniciava com cycle ativo; cores mudavam sem pedido. Velocidade dependia do número de frames de preview, divergindo do HQ. | Tonal abre com mix 30%, sem posterização/cycle. Todos os presets têm cycle desligado. Silver substitui Acid e Athos ocupa a seleção antes Neon. Vídeo e HQ usam timestamp da mídia; imagem/câmera usam tempo em segundos. |

Retícula passa a oferecer nove presets profissionais e dez formas. A receita Emoji e a opção de símbolos aleatórios (alguns ausentes na fonte) foram retiradas; texto personalizado e todas as formas geométricas úteis permanecem. O preset Text usa um glifo, evitando sobreposição de uma palavra inteira por célula.

ASCII/Retícula também corrigem a medição inicial do p5: seu canvas default ocupava 100 px no `body` flex antes do `parent()`, levando à criação de um canvas 100 px mais estreito que o palco. A resolução é recalculada imediatamente após `parent()`, sem temporizador nem broadcast global. Tanto CSS quanto backing canvas agora ocupam exatamente o container no boot e após uploads.

## Evidências

`node test-visual-tonal-quality.mjs` executa 73 verificações em Chromium real:

- Upload de imagem e vídeo nas quatro ferramentas.
- ASCII/Retícula: CSS e backing canvas correspondem exatamente ao workspace no boot e após uploads de imagem/vídeo (seis verificações).
- Todos os 33 presets oferecidos produzem variação tonal visível (não é só mudança de nome).
- Pixels estáveis na mesma imagem; flicker ASCII determinístico com timestamp fixo; enquadramento ASCII confere com cover de referência.
- Malha Retícula a 45° mantém orientação da fonte; Line/Ring visíveis.
- Retícula abre em Preencher e alterna para Ajustar/restaura o recorte sem mudar as dimensões de saída.
- Riso exportado a 2× mantém os mesmos ângulos, com diferença média de reamostragem abaixo de 12/255 no fixture (observada: 9,33).
- Gradient Map estático tem preview/HQ pixel a pixel idênticos.
- Quatro downloads PNG reais; quatro Export HQ MP4 reais, 320×180, H.264, 15 frames, decodificados com ffmpeg.
- Nenhum erro JavaScript.
- Capturas das quatro ferramentas com a fotografia `assets/fotograma-demo.jpg` inspecionadas visualmente, além do fixture tonal sintético.

O teste aceita `--production` para verificar os arquivos efetivamente publicados e `--full-hd` para trocar apenas o fixture de vídeo/expectativas por 1920×1080. As opções podem ser combinadas. Não simula o encoder nem fabrica o resultado dos downloads.

### Validação Full HD

`node test-visual-tonal-quality.mjs --full-hd`: **73/73 verificações aprovadas**, incluindo ocupação exata do workspace, Preencher/Ajustar e quatro MP4 H.264 reais de 1920×1080, 0,5 segundo e 15 frames, decodificados integralmente com ffmpeg. Nenhum cap ou motor foi alterado para fazer o teste passar.

| Ferramenta | Tempo até o download HQ | Tamanho do MP4 |
| --- | ---: | ---: |
| ASCII | 0,53 s | 292.666 bytes |
| Retícula | 0,35 s | 483.643 bytes |
| Riso | 1,85 s | 831.992 bytes |
| Gradient Map | 0,42 s | 464.714 bytes |

Medições desta máquina/rodada, em Chromium, usando fixture sintético curto e presets de entrada; não são promessa de velocidade para takes longos, celulares ou configurações mais densas. O teste mantém timeout de 90 segundos por exportação e exige a resolução exata, sem aceitar silenciosamente um fallback menor. Os testes geométricos e de presets permanecem iguais à rodada de 320×180.

## Limites que continuam explícitos

- Estas ferramentas são efeitos gráficos, não substitutos de gradação de cor gerenciada/ACES nem de um finishing em alta profundidade. O pipeline Canvas atual é SDR, 8-bit; H.264/HQ não é master ProRes/EXR com alpha.
- Gradient Map Tonal é conservador, mas nenhum preset garante pele correta em toda fonte. Duotone/Infrared/Chrome são tratamentos deliberadamente gráficos; parâmetros manuais continuam acessíveis.
- Riso CMYK é simulação visual RGB de separações, não prova de impressão ICC. Pontos muito finos podem produzir moiré após redimensionamento/compressão; avaliar no tamanho final de entrega.
- ASCII e Retícula preenchem o palco com recorte central; isso pode cortar extremidades. Retícula também oferece Ajustar para mostrar a fonte inteira. O HQ usa a proporção nativa, logo um palco livre com outra proporção pode mostrar uma composição diferente do arquivo nativo (sem deformação).
- A estabilidade testada elimina aleatoriedade involuntária e orientações incorretas; não promete ausência absoluta de aliasing em qualquer movimento/código de compressão.
- PNG do Gradient Map continua limitado à resolução do preview; Riso gera composite 2×; ASCII/Retícula exportam o canvas atual. Para vídeo com dimensões nativas, usar Export HQ.

## Quality gate (dev-squad)

- [x] Correções isoladas nos quatro arquivos, sem dependência nova ou mudança de infraestrutura.
- [x] Testes de render, presets, geometria, estabilidade e exportação reais.
- [x] Sem chamadas pagas, sem arquivos pessoais alterados, sem edição dos módulos compartilhados.
- [x] Limites de cor/resolução e recorte documentados; nenhuma promessa de master profissional universal.
- [x] `git diff --check` limpo.
