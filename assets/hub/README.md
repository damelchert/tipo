# Prévias do hub

As prévias são demonstrações, não conteúdo da galeria pessoal.

- `fotograma.webp`: cópia otimizada de `assets/tipo_fotograma_2026-07-23_23-24-18.png`, saída do Fotograma já presente no projeto. O original não foi alterado.
- As prévias de ferramentas capturadas pelo teste de auditoria documentam o resultado real dos motores da Tipó.

## Tipografia cinética

Os 23 cards cinéticos usam `kinetic/<ferramenta>.mp4` e `.webp`, renderizados pelo próprio motor da ferramenta no **primeiro preset listado**. Não são animações recriadas nem imagens de IA. Os exemplos vetoriais restantes em `shared/hub.js` pertencem apenas às ferramentas visuais sem captura.

- MP4 H.264, silencioso, 640 × 380, 24 FPS, trecho de 6 segundos em loop, faststart. O vídeo mantém o quadro inteiro, sem distorcer sua proporção; barras usam a cor de fundo do preset.
- WebP é um frame real do mesmo vídeo. Pow usa a remontagem das letras como capa e Crash usa um instante da queda, para não mostrar uma capa vazia.
- A captura aplica o callback real do preset, sem a transição de 300 ms dos sliders. Avança todos os frames nativos do p5, inclusive os estados físicos, antes de amostrar a 24 FPS. Crash Clock mostra a hora da captura.
- Texto padrão da ferramenta, exceto Flag: `TIPÓ / TYPE IN MOTION / TIPÓ / TYPE IN MOTION`. O preset A Banner com apenas quatro letras ficava minúsculo; a frase demonstra a ondulação sem alterar geometria, cores ou câmera do preset. Essa entrada existe somente no material de demonstração.
- `kinetic/manifest.json` registra ferramenta, preset, texto, enquadramento, duração, FPS, tamanho e instante da capa. A visualização não implica que a ferramenta aplique automaticamente esse preset ao abrir; ele é o primeiro botão de Presets.

### Reprodução e acesso

Somente vídeos elegíveis visíveis recebem `src`; no máximo três tocam ao mesmo tempo. Mouse ou foco dão prioridade temporária ao card sendo explorado, sem desfazer pausas ou preferências de acessibilidade. Fora da tela/aba, ficam pausados. Play/pause por card não navega para a ferramenta; favoritos e busca continuam independentes. A pausa geral persiste neste navegador; pausas individuais sobrevivem aos filtros durante a sessão. Com movimento reduzido ou economia de dados, não há download automático de MP4. Se o vídeo falhar, a capa real permanece disponível.

### Gerar e verificar

Requer Chromium do Playwright e `ffmpeg`. Não exige nenhuma chave de IA.

```bash
node support/generate-kinetic-previews.mjs
node support/generate-kinetic-previews.mjs --tools=flag,pow
node test-kinetic-previews.mjs
node test-kinetic-previews.mjs --contact-sheet
node test-hub-motion.mjs
node test-hub.mjs
node test-hub-motion.mjs --production
```

O gerador cria os arquivos intermediários em um diretório temporário e só substitui cada MP4/WebP depois de concluir a captura. O teste de mídia verifica os 23 presets, a decodificação real, 144 frames por vídeo, ausência de áudio, movimento e capas não vazias. Os 23 MP4 somam 5,82 MiB, mas não são baixados todos na abertura. O teste de movimento tem 38 verificações, e a regressão da home tem 28; cobrem reprodução, pausas, preferências, erro de mídia, teclado, toque e responsividade.
