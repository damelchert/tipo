# Fotograma — Vídeo → GIF

Implementado em 5 de setembro de 2026. Acesso: **Referências → Vídeo → GIF**, dentro do Fotograma, ou `fotograma.html#video-gif`.

## Fluxo

1. Escolha/arraste um arquivo ou abra um link HTTPS direto de vídeo.
2. Confira o original no preview; informe início/fim em segundos ou use a posição atual do player.
3. Escolha GIF, prancha de frames ou ambos e ajuste os parâmetros.
4. Gere e baixe os arquivos pelos cartões de resultado. Cancelar fica abaixo de Processando e também interrompe abertura de vídeo.

| Preset de GIF | Lado maior | FPS | Cores | Uso |
| --- | --- | --- | --- | --- |
| Compacto | 320px | 3 | 64 | Visão geral, menor arquivo |
| Equilibrado | 512px | 6 | 128 | Referência visual com movimento moderado |
| Movimento | 512px | 12 | 128 | Mais amostras temporais, arquivo maior |
| Personalizado | 320/512/720px | 3/6/12 | 64/128/256 | Ajuste manual |

O GIF preserva a proporção e não amplia a fonte. A prancha usa 3 colunas, 6/9/12 amostras distribuídas pelo trecho e timestamps visíveis; preserva o quadro inteiro, com barras quando necessário. Timestamps representam os instantes solicitados de amostragem, não uma identificação de cortes ou frames-chave por IA. Ambas as saídas são silenciosas.

## Para análise no GPT

A documentação de entrada de imagem da API OpenAI lista GIF sem animação. Portanto, **GIF animado não é garantia de leitura de toda a sequência nem de redução de tokens**. A prancha JPEG apresenta os instantes simultaneamente em uma imagem estática; reduzir amostras também descarta informação temporal. Tokens visuais dependem do modelo, dimensões e nível de detalhe, não apenas de MB. [Documentação oficial de visão](https://developers.openai.com/api/docs/guides/images-vision#image-input-requirements).

Use poucos frames para composição, luz e estilo; mais frames/trechos para ação e transições. Para timing preciso, áudio ou acontecimentos entre amostras, preserve também o vídeo original. GIF pode ficar maior que um MP4 eficiente — compare o tamanho exibido em cada saída.

## Limites e privacidade

- Processamento no navegador. Não exige chave, conta, Higgsfield, Google ou créditos de IA. O encoder GIF é carregado do CDN somente ao exportar GIF; prancha não precisa dele.
- Arquivo local até 300 MB, vídeo finito até 24 h e até 40 MP por frame. MOV/HEVC depende dos codecs do navegador; MP4/H.264 é uma alternativa para incompatibilidades.
- GIF até 30 s/360 frames, limite de trabalho de 120 milhões de pixels e saída de 24 MiB. Reduzir FPS, resolução ou duração evita cargas excessivas. Prancha pode cobrir o vídeo inteiro.
- Link precisa apontar para mídia decodificável e permitir CORS. O navegador acessa o servidor do link; o arquivo não passa por um servidor Tipó. Sem proxy, cookies externos de login ou headers dos provedores. Páginas de YouTube/Instagram/Vimeo e streams ao vivo não são suportados.
- CSP permite HTTPS em `media-src`, mas mantém `connect-src` restrito. URL assinada fica somente na sessão, sem gravação em storage nem inclusão nas saídas. O servidor do vídeo ainda vê a conexão normal de rede do navegador.
- Resultados são da sessão, não da galeria IndexedDB de imagens. Trocar de aba dentro do Fotograma preserva fonte e exportações; recarregar/fechar remove esses dados temporários. Baixe os resultados importantes.
- Cancelamento cooperativo entre quadros, inclusive durante carregamento/seek; nunca publica arquivo parcial. Percentual é baseado no trabalho concluído; ETA é estimada.

## Verificação

- `node test-video-reference-engine.mjs`: vídeos sintéticos, encoder real, FFmpeg, GIF89a/frame count/duração/variação, JPEG com timestamps, retrato, prancha de 40 s, cancelamento, validação, timeout/limpeza, falha CDN e limite de 24 MiB.
- `node test-video-reference-ui.mjs`: 32 verificações de interface desktop/mobile, upload, preview, recorte (inclusive fim fracionário), presets, download GIF/JPG decodificável, troca de aba, cancelamento, HTTPS/CORS e ausência de geração paga.
- `node test-video-reference-ui.mjs --production`: mesmo fluxo com HTML/CSS/JS reais publicados; apenas o servidor de vídeo do teste é simulado.
- Regressões: `test-fotograma-tools.mjs` e `test-fotograma-audit.mjs`.

Qualidade: padrões de controles e tokens existentes reaproveitados; rótulos e ações por teclado, foco visível, tema claro/escuro, controles bloqueados durante jobs e status anunciado. Não há alegação de certificação WCAG ou teste em todos os dispositivos/decodificadores. Squads de desenvolvimento e design aplicados; nenhum modelo generativo foi chamado.
