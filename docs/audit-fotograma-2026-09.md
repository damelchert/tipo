# Auditoria do Fotograma — 5 de setembro de 2026

## Resultado

Revisão de código, contratos de prompt e interface implementada. Os testes abaixo usam modelos e imagens sintéticos; validam o comportamento da Tipó sem gerar imagens pagas. Não certificam a qualidade estética ou fidelidade de uma geração real de cada modelo.

## Problemas corrigidos

| Prioridade | Problema observado | Correção |
| --- | --- | --- |
| Alta | Cast/Product/Sheets cortavam a direção após 1.600 caracteres; Animation após 1.200, sem avisar. | Orçamento explícito de 12.000 caracteres, contador e validação que não corta o brief. |
| Alta | Mesmo aceitando Create longo, o Diretor Google podia reescrevê-lo sob um teto de 1.600 caracteres. | Briefs acima desse teto passam completos ao compilador local; análise de referência/ficha permanece separada. |
| Alta | A ferramenta, prompt, origem e modelo eram lidos depois do `await` do health. Trocar de aba podia mudar a operação paga. | Snapshot completo antes de qualquer operação assíncrona; resultado e metadados continuam ligados à aba original. |
| Alta | Resultado concluído depois de trocar de aba era salvo com a ferramenta incorreta. | Proveniência imutável, resultados por ferramenta e confirmação na galeria mesmo fora da aba de origem. |
| Alta | Utilitários não compartilhavam a capacidade de quatro jobs com Create. | Reserva/liberação de um slot Higgsfield; bloqueio honesto quando todos estão ocupados, sem tentativa excedente. |
| Alta | Multi Angle dependia de `qwen_camera_control`, ausente no catálogo atual verificado pelo auditor de conectores. | Retirado da navegação ativa; caminho legado bloqueado por capability antes do POST. Não foi substituído por um prompt que simulasse o motor. |
| Média | Product mandava preservar orientação e, ao mesmo tempo, permitia mudar câmera. | Preserva design/geometria; uma nova vista pode ser pedida sem uma instrução espacial contraditória. |
| Média | Expressões herdava regra de não cortar membros e proteção de produto; detalhes de produto herdavam regras de corpo. | Proteções e enquadramento próprios por prancha: rosto, corpo inteiro, turnaround e vistas/detalhe de produto. |
| Média | Animation proibia logos, apagando potencialmente lettering já presente na origem. | Mantém lettering da origem e proíbe apenas adições. A interface deixa claro que gera uma imagem estática, não vídeo. |
| Média | Styled 3D mandava redesenhar proporções enquanto o sufixo mandava preservar corpo. | Estilização de superfícies e planos; proporções ficam preservadas. |
| Média | Processamento de ferramentas não aparecia no grid. | Cards com ferramenta, tempo e percentual **estimados**, substituídos pelo resultado; nenhuma simulação de progresso real do provedor. |
| Média | Imagens da galeria não abriam pelo teclado e o foco escapava do inspector. | Enter/Espaço para abrir; foco contido no modal; Escape e X para fechar. |
| Média | UI de ferramentas tinha opções sem rótulo e textos de 8–11 px. | Rótulos de modelo/proporção/resolução, texto principal de 13 px, ajuda de 11 px, alvos e foco visíveis, ação principal persistente no painel. |

## Direção e limites por seção

| Seção | Contrato revisado | Decisão |
| --- | --- | --- |
| Create · Cinema | Observação narrativa, materiais físicos, luz motivada, cor e textura de película. | Mantido. Direção técnica arbitrada por slot evita acumular defaults conflitantes. |
| Create · Publicidade | Geral, Moda/Luxo, Streetwear, Automotivo, Comida/Bebida, Beleza/Fragrância, Esporte e Tecnologia. | Mantidos os oito gêneros; cada um resolve seus próprios slots. Ficha/cena assumem apenas os slots especificados. |
| Create · Music Video | Performance, set autoral, direção gráfica e luz física; não herda linguagem de catálogo. | Mantido. |
| Emulsão | Transfere cor, resposta de luz e textura; não importa sujeitos nem objetos. | Mantida a separação das referências de conteúdo e a arbitragem com Ficha. |
| Referências | Personagem, produto, ambiente, figurino e composição podem coexistir na mesma imagem sem duplicar o binário. | Mantido e coberto por regressão. Auto não resolvido pede função explícita. |
| Cast | Identidade única; Natural, Cinematic, Editorial, Advertising e quatro fundos. | Melhorada fidelidade do brief/idade e copy sem garantia absoluta de rosto. |
| Product | Studio, Campaign, Lifestyle e Macro. | Preserva geometria/branding; permite câmera/ambiente sem redesenhar o produto. |
| Sheets | Turnaround 4 vistas; expressões 3×2; poses 3×2; produto 4 vistas + detalhe. | Pranchas têm regras próprias de enquadramento. Faces/costas/detalhes ocultos continuam sendo inferência de IA, não documentação técnica medida. |
| Animation | 3D Film, Feature 3D, Stylized 3D, Modern 2D, Anime Film e Clay. | Seis contratos distintos de meio/material; protege conteúdo, lettering e luz de origem. Saída estática. |
| Expand | Outpaint dedicado por proporção, sem prompt textual. | Mantido; interface mostra parâmetros reais no preview. Resultado deve ser conferido nas bordas. |
| Remove BG | Remoção dedicada de fundo, sem prompt textual. | Mantido como beta; cabelo, transparência e sombra precisam de revisão. |
| Multi Angle | Motor dedicado retirado do catálogo atual. | Fora da navegação ativa; nenhum job pago é submetido pelo fluxo bloqueado. |

O Create continua assumindo a assinatura fotoquímica da Tipó, incluindo grão e proteção de highlights, conforme decisões anteriores. A interface agora informa essa característica junto da estética. Cast, Product e Animation não recebem o compilador cinematográfico indiscriminadamente.

Cada ferramenta gerativa ganhou uma prévia do prompt completo. Ferramentas dedicadas mostram seus parâmetros, sem fingir que usam um system prompt. Trata-se de instruções de geração, não de garantia de correspondência pixel a pixel ou identidade.

## Evidências

- `node test-fotograma-audit.mjs` — limites, perda de brief, tipos de prancha, Multi Angle bloqueado, snapshots antes do health, mudança de aba, progresso, capacidade compartilhada, proveniência e teclado/modal.
- `node test-fotograma-tools.mjs --screenshot` — Cast/Product/Sheets/Animation/Expand/Remove BG, upload/drag da galeria, prévia e inspector, grid e busca, desktop/mobile sem overflow; contrato histórico do Multi Angle apenas em fixture explicitamente disponível.
- `node test-fotograma-prompt.mjs` — programas, oito gêneros, Ficha, papéis de referência, Emulsão, preview e fallbacks locais.
- `node test-fotograma-v3.mjs` — matriz de looks, granularidade de slots, referências múltiplas, snapshot, falsos bloqueios, dados de transparência e UX mobile.
- `node test-fotograma-batch.mjs` — lote 1–4, cliques sucessivos, fila contínua, longos prompts, persistência da galeria e progresso estimado.

Capturas de inspeção locais: `/private/tmp/tipo-fotograma-gallery.png` e `/private/tmp/tipo-fotograma-lightbox.png`. As imagens geométricas nessas capturas são fixtures de teste, não novos resultados criativos.

## Critérios aplicados e limites da revisão

Os squads audiovisual e de desenvolvimento orientaram a proteção explícita de identidade/áreas não alteradas, linguagem visual concreta, separação entre tipos de ferramenta, snapshots de operações assíncronas e testes de regressão. Referências oficiais consultadas: [documentação Gemini Image](https://ai.google.dev/gemini-api/docs/image-generation) e [guia de prompts Nano Banana Pro](https://blog.google/products-and-platforms/products/gemini/prompting-tips-nano-banana-pro/). A documentação atual distingue modelos mais adequados a referências múltiplas; a escolha do modelo continua impactando fidelidade mesmo com prompt correto.

Qualidade: funções novas com nomes por responsabilidade; validação antes do POST; sem fallback pago nos utilitários; sem novas dependências; sem alteração de imagens pessoais ou credenciais. Os checks críticos de implementação e regressão passaram. Qualidade visual por modelo, quantidade exata de detalhes reconstituídos e qualidade de recorte exigem avaliação de saídas reais; não foram apresentados como comprovados por mocks.

Persistência da galeria continua local via IndexedDB. Não é backup em nuvem e limpar dados do site pode apagar os arquivos. A auditoria de autenticação, faturamento e modelos do provedor está documentada separadamente pelo auditor de conectores.
