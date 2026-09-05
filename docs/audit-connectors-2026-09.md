# Auditoria dos conectores — 5 de setembro de 2026

## Resultado

Higgsfield está autenticado no Mac e acessível pelo Fotograma, inclusive em um navegador de teste usando a origem de produção. O CLI é `1.1.24`; o serviço local tem inicialização automática e reinício supervisionado pelo macOS. Não foi necessário abrir login, copiar código ou transferir credenciais para a página.

O contrato Google foi validado com documentação oficial e respostas simuladas no navegador. **Não houve geração real nesta auditoria, nem consumo intencional de créditos de imagem.** Isso valida integração, controles e tratamento de erro; não comprova a qualidade visual de cada modelo nem a cota atual de uma chave Google particular.

## Problemas encontrados e correções

| Achado | Consequência | Correção |
| --- | --- | --- |
| `qwen_camera_control` não existe no catálogo atual consultado pelo CLI | Multi Angle parecia pronto, mas usava um motor ausente | Capacidade marcada indisponível; bridge responde 410 antes de enviar imagem ou chamar geração. A interface retira o acesso ativo. |
| GPT Image 2 recebia `batch_size`, ausente no contrato atual | Dependência de parâmetro não suportado/documentado | Flag retirada; cada job continua gerando uma imagem. |
| Vertex priorizava somente caminhos com `projects/-/locations/global` | Express dependia de rotas de compatibilidade e podia demorar mais para conectar | Rota Express oficial `/v1beta1/publishers/google/models/…:generateContent` primeiro; rotas globais mantidas apenas como compatibilidade após recusa 400/404. |
| Falha de rede repetia o POST Vertex em outra rota | Um pedido aceito, cuja resposta se perdeu, poderia ser cobrado novamente | Erro de rede, timeout e falha de autenticação não repetem o POST. |
| Google sem limite de tempo para resposta e transferência | Fila poderia ficar ocupada indefinidamente | Limites separados: 30 s para leitura de catálogo, 5 min para geração/resposta, incluindo o corpo. |
| Resposta Google 200 sem imagem disparava outra tentativa | Recusa ou saída textual podia originar várias chamadas | Uma resposta concluída sem imagem encerra a tentativa e informa o motivo. |
| Saída Google abaixo de 2K/4K gerava até três imagens para substituí-la | Cobrança adicional invisível e descarte de imagens já produzidas | Preserva a primeira saída e informa dimensão real; não repete geração paga. |
| Erro de cota/permissão Google trocava automaticamente para outro modelo | Custo e identidade visual diferentes da seleção do usuário | Modelo escolhido é determinístico; erro oferece revisão de acesso ou troca manual. |
| Detalhes brutos de erros Google iam para logs | Potencial exposição da chave devolvida em uma mensagem de erro | Sanitização na camada de transporte e em todos os logs de referência, direção e geração. Chave somente em header. |
| Download Higgsfield seguia qualquer redirecionamento, sem tempo máximo | Slot preso, consumo excessivo de memória ou destino indevido | Timeout de 2 min, validação de cada redirect HTTPS, limite de 3 redirects e 32 MB contado durante streaming, apenas PNG/JPEG/WebP. |
| Browser tinha pouca folga para baixar a imagem depois do CLI | Timeout da página podia ocorrer após o job concluir | Limite de geração do adapter aumentado para 26 min; health permanece 30 s e OAuth 13 min. |
| Consultas simultâneas de saldo abriam subprocessos redundantes | Mais processos e renovações concorrentes desnecessárias | Consulta de conta em voo compartilhada, sem cache persistente de saldo. |
| Texto dizia que Nano Banana 2 tinha faixa grátis na API | Expectativa de custo incorreta | UI informa necessidade de cota, faturamento ou créditos Google ativos. |

Falha no download de uma imagem já concluída agora explicita que o job terminou no Higgsfield e recomenda conferir o histórico antes de gerar novamente.

## Catálogo confirmado, sem geração

Consultas `model get … --json` autenticadas confirmaram modelos, formatos e resoluções usados por Nano Banana Pro, Nano Banana 2, Seedream 5 Lite, Seedream 5 Pro, Seedream 4.5, GPT Image 2, Outpaint e Image Background Remover. `nano_banana_2` continua aceito como alias de Nano Banana Pro (`nano_banana_pro`).

`model get qwen_camera_control` respondeu que o modelo não existe. `model list --json` também não o listou. Por isso, Multi Angle fica pausado; não foi substituído silenciosamente por um prompt que fingisse controle geométrico preciso.

As estimativas de crédito existentes na UI continuam identificadas como estimativas; o contrato de parâmetros não fornece uma cotação atual de custo. O saldo é consultado na conta real após um job.

## Verificações executadas

| Teste | Modalidade | Resultado |
| --- | --- | --- |
| `test-connector-safety.mjs` | 12 testes unitários com fetch simulado | PASS: timeouts, erro ambíguo, proteção da chave, redirect, raster, limite de bytes e capacidade removida |
| `test-higgsfield-bridge.mjs` | Servidor real local; pedidos inválidos sem CLI de geração | PASS: origem, preflight, rede local, allowlist e bloqueio Multi Angle |
| `test-higgsfield-bridge-concurrency.mjs` | Servidor real + CLI e downloads simulados | PASS: OAuth, quatro slots, quinto recusado, GPT2 e redação de tokens |
| `test-fotograma-vertex.mjs` | Chromium + Google simulado | PASS: Express, TEXT+IMAGE, 2K, chave em header, apenas um POST em falha de rede/401/resposta sem imagem; cota não troca modelo |
| `test-fotograma-higgsfield.mjs` | Chromium + bridge simulado | PASS: modelos, restrições de formato, custos, conexão sem Google, provedor e ausência de retry pago |
| `test-fotograma-res.mjs` | Chromium + Google simulado | PASS: saída menor preservada, aviso, emulsão e formato/resolução enviados corretamente |
| `test-fotograma-higgsfield-reconnect.mjs` | Chromium + bridge simulado | PASS: boot, queda/retomada, OAuth, foco, rede, identidade de adapter, fila e ausência de reenvio após POST |
| `test-fotograma-higgsfield-live.mjs` | Chromium com origem de produção + bridge/conta reais | PASS: conexão automática, saldo numérico, geração habilitada, sem popover, sem erros de página ou de rede. Não chama generate/tool. |
| `node --check`, `git diff --check` | Estático | PASS nos arquivos de conectores |

As regressões usam imagens de canvas como fixtures, não imagens produzidas por modelos reais. As chamadas de saúde e catálogo feitas contra Higgsfield são somente leitura. Não foi realizado logout para testar recuperação da conta real.

## Limites que permanecem explícitos

- O bridge atual é local: o Mac precisa estar ligado, com sessão de usuário ativa e serviço rodando. Uma instalação local não oferece geração remota a partir de outro computador ou celular.
- A sessão OAuth pode ser revogada ou exigir renovação imposta pelo Higgsfield. A Tipó reutiliza a sessão e retoma conexão; não promete autenticação perpétua nem contorna o login do provedor.
- A primeira autorização de acesso à rede local pode ser exigida pelo navegador.
- Não há confirmação live de geração Google com a chave particular do usuário nesta auditoria. Restrições de chave, billing e cota dependem da conta Google.
- O custo do CLI Higgsfield não é ilimitado: a documentação oficial restringe Unlimited ao site. A Tipó deve continuar exibindo créditos e não prometer gratuidade.
- Qualidade do recorte Remove BG, preenchimento Expand e fidelidade de cada estilo exigem avaliação de saídas reais; testes de contrato não substituem esse julgamento.
- Reiniciar o LaunchAgent após publicação deve ocorrer somente com `busy:false`, para não interromper jobs do usuário.

## Fontes oficiais consultadas

- [Higgsfield — acesso via CLI e Skills](https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-access-higgsfield-via-cli): autenticação, conta compartilhada e uso de créditos no CLI.
- [Higgsfield — Unlimited](https://higgsfield.ai/creator-hub/help-center/credits/what-are-unlimited-models-and-which-plans-include-them): Unlimited restrito ao site, não ao CLI.
- [Google — Express REST API](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/express-mode/api-reference): endpoint global sem projeto/localização, versões v1 e v1beta1.
- [Google — geração de imagens](https://ai.google.dev/gemini-api/docs/image-generation): modelos atuais e limite 1K do Flash Lite Image.
- [Google — preços da Gemini API](https://ai.google.dev/gemini-api/docs/pricing): modelos de imagem Nano Banana 2 e 2 Lite sem faixa grátis da API.

Squad aplicado: desenvolvimento, especialidade de contratos de API e qualidade de integração. A revisão priorizou requisições determinísticas, erros compreensíveis, proteção de credenciais e testes de regressão.
