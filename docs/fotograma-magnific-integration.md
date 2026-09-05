# Fotograma — proposta de integração Magnific

Pesquisa verificada em **05/09/2026**. Estado: **proposta, não implementada**. Nenhuma conta foi conectada; nenhuma chave foi consultada; nenhuma imagem foi enviada ou gerada nesta pesquisa. A identificação da conta pessoal de Daniel — Legacy ou plataforma atual — continua pendente.

## Decisão pendente

Não exibir um conector funcional, um saldo ou um botão de geração Magnific antes de existir autenticação real e uma operação validada. A interface Precision/Creative é viável com serviços públicos documentados; isso não comprova que a assinatura pessoal existente dê acesso aos mesmos serviços.

| Conta de Daniel | O que está confirmado | Próximo passo seguro |
| --- | --- | --- |
| Plataforma atual `magnific.com` | API REST e MCP oficiais; consumo por créditos | Confirmar conta/plano e escolher chave privada no backend ou autorização OAuth MCP |
| Conta antiga `magnific.ai` / Legacy | Assinatura e tokens preservados no serviço antigo | Confirmar com a conta/suporte se existe acesso à API atual ou migração; não presumir transferência de saldo |
| Ainda não identificado | Nenhum acesso pessoal foi verificado | Aguardar a resposta de Daniel, sem configurar autenticação por suposição |

A antiga página [Freepik API](https://www.freepik.com/api) redirecionou para Magnific durante a pesquisa. O site atual informa que assinaturas existentes de magnific.ai permanecem no serviço antigo até o vencimento; a página Legacy preserva criações, tokens e assinatura ali. **Não foi encontrada confirmação de reutilização automática desses tokens na API atual.** [FAQ da plataforma atual](https://www.magnific.com/), [Magnific Legacy](https://magnific.ai/legacy/).

## Integrações públicas suportadas

### REST com chave privada

A documentação atual especifica base `https://api.magnific.com`, header `x-magnific-api-key` e chamadas **servidor-servidor**. Chave privada é o método documentado para REST; não deve ser enviada ao browser da Tipó. [Autenticação REST](https://docs.magnific.com/authentication).

O administrador pode gerar a chave no [painel de API keys](https://www.magnific.com/user/organization/api-keys). A disponibilidade concreta para a conta de Daniel não foi testada. [Quickstart](https://docs.magnific.com/quickstart).

Cada chamada de geração/edição/upscale desconta créditos da organização. Franquias **Unlimited do produto web não se aplicam à API**. A documentação atual não justifica afirmar genericamente que todo usuário precisa de uma carteira API separada; tampouco comprova compatibilidade com a carteira Legacy. [Cobrança por créditos](https://docs.magnific.com/pricing).

### MCP com OAuth

Existe servidor oficial `https://mcp.magnific.com`, com Streamable HTTP e OAuth 2.0. O usuário autoriza a conta no navegador e o cliente mantém a sessão. A documentação informa saldo compartilhado com o produto web atual e expõe `images_upscale`, `account_balance`, `images_models_list` e `images_models_show`; `tools/list` ao vivo é a fonte do schema disponível. [Magnific MCP](https://docs.magnific.com/modelcontextprotocol).

**Inferência de engenharia:** um botão “Conectar Magnific” na Tipó pode ser construído como cliente MCP/OAuth. Isso exige implementar o fluxo, persistência segura dos tokens e tratamento de revogação/expiração. Não equivale a reutilizar um token OAuth diretamente na API REST, nem comprova acesso de uma conta Legacy. Não prometer login Google específico ou conexão eterna.

## Contratos dos modos de upscale

Base dos caminhos abaixo: `https://api.magnific.com`. São operações de **imagem**, não promessa de upscale temporal de vídeo.

| Modo | POST | Entrada e controles |
| --- | --- | --- |
| Creative | `/v1/ai/image-upscaler` | Base64; escala `2x`, `4x`, `8x`, `16x`; prompt; `creativity`, `hdr`, `resemblance`, `fractality`, inteiros de −10 a 10, padrão 0 |
| Precision V2 | `/v1/ai/image-upscaler-precision-v2` | HTTPS público ou base64; escala inteira 2–16; `sharpen`, `smart_grain`, `ultra_detail`, inteiros 0–100, padrões 7/7/30; `flavor` |
| Precision V1 | `/v1/ai/image-upscaler-precision` | Base64; os três controles anteriores 0–100, padrões 50/7/30; o schema consultado não expõe escala |

Creative tem limite documentado de **25,3 milhões de pixels na saída**. Engines: `automatic`, `magnific_illusio`, `magnific_sharpy`, `magnific_sparkle`. Otimizações: `standard`, `soft_portraits`, `hard_portraits`, `art_n_illustration`, `videogame_assets`, `nature_n_landscapes`, `films_n_photography`, `3d_renders`, `science_fiction_n_horror`. Usar o contrato específico como autoridade; a introdução menciona URL, mas o schema da entrada especifica base64. [Contrato Creative](https://docs.magnific.com/api-reference/image-upscaler-creative/post-image-upscaler).

Precision V2 oferece `photo`, `photo_denoiser` e `sublime`. Não foi identificado no contrato consultado um limite explícito de megapixels que permita aplicar automaticamente o teto Creative ao V2. [Contrato Precision V2](https://docs.magnific.com/api-reference/image-upscaler-precision-v2/post-image-upscaler-precision-v2).

Há inconsistência documental: o overview V2 diz que V1 não tinha os três controles, mas o contrato V1 os lista. Não implementar diferenças de versão apenas com base no texto introdutório. [Contrato Precision V1](https://docs.magnific.com/api-reference/image-upscaler-precision/post-image-upscaler-precision).

São tarefas assíncronas, com `task_id` e webhook opcional. No V2, GET `/v1/ai/image-upscaler-precision-v2/{task-id}` consulta o resultado. Precision busca fidelidade com detalhe controlado; Creative permite reconstrução e estilização guiadas. Isso não garante identidade ou precisão absoluta: ambos exigem inspeção de texto, pele, produto e geometria. [Visão geral Precision V2](https://docs.magnific.com/api-reference/image-upscaler-precision-v2/overview).

## Proposta para a Tipó — ainda não é contrato implementado

1. **Confirmar conta e canal.** Não coletar senha/cookies do site. REST: segredo no servidor ou bridge local escolhido pelo usuário. MCP: autorização oficial, com tokens protegidos e isolamento por conta.
2. **Verificar acesso sem gerar.** Consultar identidade/capacidades/saldo quando o canal oferecer essas operações. Saldo ausente é desconhecido, não zero. Mostrar Legacy/atual e provider real.
3. **Preservar o arquivo original.** O fluxo atual `setUtilityFile()` reduz referências para 2048 px. Upscale deve usar um caminho próprio, conservando o original e gerando apenas a miniatura separadamente. Informar tamanho de entrada e saída; não esconder uma redução anterior ao upscale.
4. **Começar por Precision V2.** Default proposto: `photo`, 2×, 7/7/30. Creative em aba própria, com descrição do risco de mudar detalhes e controles avançados identificados. Esses defaults são proposta de UX, não avaliação visual realizada.
5. **Congelar o pedido.** Snapshot com arquivo, modo, parâmetros e conta ao clicar. Mudanças de aba/slider não alteram uma tarefa em andamento. Salvar versão do contrato e engine devolvido, quando disponível.
6. **Criar job durável.** Separar envio do acompanhamento; guardar `task_id` antes de aguardar. Timeout do browser não prova falha do provedor. Reconsultar tarefa conhecida; não repetir POST pago automaticamente em resposta ambígua. Deduplicação local não deve ser apresentada como idempotência suportada pelo provedor.
7. **Progresso honesto.** Tempo decorrido e estados reais; ETA somente identificado como estimativa. Não inventar porcentagem do processamento. “Parar de acompanhar” não deve ser chamado de cancelamento do job sem endpoint confirmado.
8. **Resultado e procedência.** Comparador antes/depois, dimensões, download original, parâmetros efetivamente enviados e aviso de reconstrução. Persistência na galeria deve distinguir arquivo local de URL temporária e permitir backup.
9. **Custos e limites.** Exibir estimativa ou “custo ainda não informado”, nunca alegar Unlimited por inferência. Validar formato, tamanho e área antes do POST; tratar 401/403/429 e falhas sem cobrar novamente silenciosamente. Limites de requisição variam conforme conta/acordo. [Rate limits](https://docs.magnific.com/ratelimits).

## Image Pro (Runware): rótulo opaco, não modelo identificado

A imagem da plataforma de referência identifica um rótulo “Image Pro (Runware)”; isso **não revela o AIR ID, o backend efetivo, os pesos nem os prompts privados**. Não nomear uma implementação Tipó como cópia idêntica sem evidência.

Runware utiliza API independente: `https://api.runware.ai/v1`, header `Authorization: Bearer <API_KEY>`, array de tarefas e `taskUUID` por operação. Geração usa `taskType: imageInference` e um identificador exato de modelo. [Autenticação Runware](https://runware.ai/docs/platform/authentication).

O saldo Runware é cobrado por uso em USD; `includeCost` permite retornar o custo real. Não há base documental consultada para reaproveitar assinatura ou créditos Higgsfield/Magnific nesse saldo. [Preços Runware](https://runware.ai/docs/platform/pricing).

Por exemplo, o catálogo contém Wan2.7 Image Pro (`alibaba:wan@2.7-image-pro`), com prompt até 3.000, dimensões 768–4096 em passos de 16, até nove referências e 1–20 resultados. Isso **não identifica o modelo do colega**; limites variam por modelo. [Contrato Wan2.7 Image Pro](https://runware.ai/docs/models/alibaba-wan2-7-image-pro).

Também existiu Grok Imagine Image Pro (`xai:grok-imagine@image-pro`), com desativação anunciada para 15/05/2026. Um nome genérico não é uma integração estável. [Changelog Runware](https://runware.ai/docs/changelog).

**Direção para o Fotograma existente:** Nano Banana Pro, já disponível no catálogo local Higgsfield como `nano_banana_2`, pode receber os perfis autorais de direção como parte do prompt. Isso é compatibilidade de contrato textual, não uma nova versão do modelo, fine-tune, integração Runware ou clonagem dos resultados/prompts do colega. Preservar o nome do provedor e do motor reais na interface e na galeria. A qualidade de cada perfil ainda deve ser avaliada visualmente com referências controladas.

## Critérios de aceite antes de disponibilizar

- [ ] Daniel identificou a conta e autorizou o canal escolhido.
- [ ] Acesso real validado; chaves/tokens nunca aparecem no frontend ou em logs.
- [ ] Saldo e política de cobrança da conta foram confirmados; Legacy não é tratado como conta atual por suposição.
- [ ] Schema do canal escolhido foi confrontado com as capacidades reais, inclusive via MCP se aplicável.
- [ ] Um teste pago autorizado por modo valida resultado, dimensão, custo e download.
- [ ] Original preservado; sem pré-redução silenciosa para 2048 px.
- [ ] Troca de aba, timeout, reload, expiração de sessão, 429 e resposta ambígua não provocam novo pedido pago automático.
- [ ] Progresso, custo, provedor, prompt e parâmetros apresentados correspondem ao job salvo.
- [ ] Texto legível, rosto, contorno, textura e geometria comparados antes/depois; limitações descritas sem garantia absoluta.

Checklist dev-squad aplicado ao desenho: fronteiras de conta/provedor, segredo no servidor, validação e erros definidos como requisitos. Testes de runtime permanecem **não executados**, pois esta entrega é documentação e não implementa um conector.
