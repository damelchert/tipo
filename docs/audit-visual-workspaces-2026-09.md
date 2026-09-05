# Auditoria — workspaces de composição e IA

Data: 05/09/2026. Escopo desta parte: Studio, Pattern, Palette, Depth, Mockup, AudioType, Video Depth Map e navegação do Fotograma. A revisão usa os critérios de comportamento verificável do dev-squad e legibilidade/interação do design squad.

## Correções concretas

- **AudioType:** os oito presets descartavam a imagem enviada; agora preservam a fonte. O mapeamento da imagem para a grade deformava a proporção; agora existe Contain/Cover explícito, com proporção preservada. “Use text” volta ao texto sem apagar a configuração visual. O gravador não recebia o áudio do analisador próprio da ferramenta; agora o MP4 inclui a trilha ativa. Uploads assíncronos seguem a escolha mais recente. Mono é a entrada neutra e o primeiro preset; opções intensas continuam disponíveis por escolha manual.
- **Pattern:** o SVG tipográfico usava escape JSON no atributo XML da fonte, produzindo XML inválido quando a família continha aspas. Corrigido para escape XML; símbolos `<`, `>` e `&` são preservados em vez de apagados. A fonte de biblioteca é exportada com o nome real, não com o alias interno do browser.
- **Palette:** removida a cópia intermediária em resolução total de cada foto; a imagem é desenhada diretamente nos buffers limitados de análise/preview. Erros de decodificação são visíveis e não substituem uma fonte válida. Reset usa os mesmos pixels de demonstração, sem variar se a fonte terminou de carregar entre a entrada e o reset.
- **Mockup:** os Object URLs dos uploads agora são liberados no sucesso e no erro. A última escolha vence uploads concorrentes; um arquivo inválido deixa a arte anterior intacta e mostra uma mensagem.
- **Studio:** mantido o canvas infinito e o enquadramento por frame. Ações de frame cresceram para 32px. A seleção de fontes/efeitos é operável por teclado, o modal contém o foco e fecha com Escape; Delete dentro dele não exclui um frame atrás do modal.
- **Depth:** resultado de inferência atrasado não pode ser aplicado à imagem seguinte. A UI explica que Luminance é ao vivo, AI é um snapshot e Video Depth Map é a ferramenta adequada para profundidade por frame.
- **Video Depth Map:** nesta rodada, mantidos e retestados preview principal, upload central, texto de presets, bloqueio de troca de vídeo durante processamento, cancelamento e MP4 automático já implementados.
- **Fotograma:** não houve alteração de conta, providers, prompts ou persistência da galeria nesta parte. Foram verificadas as abas visíveis e sua área de trabalho. A aba local Vídeo → GIF tem preview próprio; não deve ser tratada como uma aba de galeria de imagens. Ferramentas bloqueadas por capacidade permanecem fora da navegação visível.

## Função real e limites

| Ferramenta | Entrega verificada | Limites a manter explícitos |
|---|---|---|
| Studio | Composição com múltiplos frames, cadeia de 20 efeitos, oito receitas preservando mídia, PNG/MP4, teclado no seletor | É um workspace infinito, não um preview full-bleed. O buffer interativo limita lado curto a 900px e longo a 1440px; exportação padrão usa esse frame. |
| Pattern | Padrões procedurais, simetrias, texto, PNG, tile e SVG; animação/MP4 | Não é filtro de upload de vídeo. Tile tem 512/1024/2048px. Texto SVG permanece texto e exige a fonte no aplicativo que o abrir; fontes customizadas não são convertidas em contornos. |
| Palette | Extração de cores, harmonias, amostras ASE, CSS, JSON e PNG | Trabalha com imagens estáticas. Análise amostrada em até 360px; preview até 1600px. PNG é a composição da paleta, não uma foto em resolução original. |
| Depth | Relevo 3D, parallax, imagem/vídeo, depth manual, Luminance ao vivo | Luminance não estima distância física. AI é estimativa de um frame. Render tem lado longo de 1080px; depth de trabalho é limitado e o Depth PNG 1024 é reamostragem, não inferência nativa 1024. |
| Mockup | Arte preservada em cinco cenas, perspectiva, Contain/Cover, PNG 1× e 2× | Cenas são ilustrações procedurais, não fotografia nem IA. A arte é preparada em buffer de até 720px antes da projeção; 2× aumenta a composição, não recupera detalhes da arte. |
| AudioType | Texto/imagem reagindo a áudio, oito presets, Contain/Cover e MP4 com trilha real | Não aceita vídeo como fonte visual; aceita imagem + áudio. A máscara é amostrada em buffer de até 800px. Microfone físico não foi usado nos testes. |
| Video Depth Map | Preview de vídeo, presets, cancelamento, análise temporal e download automático MP4 | Máximo de 900 amostras de análise por passe. Exige suporte do browser a codecs/modelo. A inferência neural foi simulada nesta rodada; decodificação, processamento temporal e exportação de vídeo foram reais. |
| Fotograma | Navegação das abas disponíveis, galeria/estado vazio e workspace local de vídeo | Geração paga, qualidade semântica de modelos, autenticação Vertex/Higgsfield e persistência de histórico não foram revalidadas nesta parte. |

## Evidência e reprodução

- `node test-visual-workspace-quality.mjs`: oito workspaces, PNG retrato 200×400 e MP4 de teste reais, preservação de fontes nos presets, erro de upload, proporção, teclado, XML de texto SVG e fonte neural obsoleta. Exporta e decodifica um MP4 do AudioType com seno de 440Hz; valida que a trilha de áudio existe e não é silenciosa. Somente o retorno da inferência de Depth é fake, para testar a proteção contra resultado obsoleto.
- `node test-studio.mjs`: regressão da composição, 20 efeitos, oito receitas, múltiplos frames, blend, PNG e MP4 decodificável.
- `node test-palette.mjs`: extração determinística, seis famílias de harmonias, reset, ASE/CSS/JSON/PNG.
- `node test-pattern.mjs`: simetrias, periodicidade, render, PNG/tile/SVG e animação/MP4.
- `node test-mockup.mjs`: perspectiva, cinco cenas/presets, fit, composição e exportação.
- `node test-depthmap.mjs`: fluxo completo com inferência substituída, progresso, cancelamento, MP4 automático decodificado/grayscale, estabilidade temporal, integração da home e mobile.

Os testes criam artefatos em diretórios temporários e não alteram galerias do usuário. Screenshots e resultados JSON das oito áreas ficam no diretório impresso por `test-visual-workspace-quality.mjs`. Aprovação desses testes não equivale a certificação visual de toda combinação de parâmetros, de toda GPU ou de todo codec.
