# Fotograma — prompts, direção e contas

Revisão de 05/09/2026. Após inspecionar a prévia, Daniel aprovou os ajustes de looks e o commit/push conjunto com Imagem & Efeitos. As evidências abaixo distinguem os testes de software da qualidade dos modelos de IA; aprovação de publicação não equivale a validação estética por geração real.

**Liberação autorizada:** restauração da assinatura Naturalista, perfis de cinema mais distintos, três caminhos de criação, navegação/comparação no visualizador e retirada dos leitores de prompts da interface. Base anterior `b1ec154`. Após ser informado de que o código ainda não é privado, Daniel pediu “faz push e vamo ser feliz”; a suspensão anterior de publicação foi encerrada. O backend privado permanece pendente e a publicação deste bloco não torna as receitas confidenciais.

## Evidência da referência

Inspecionada a gravação de 2min14s fornecida por Daniel, incluindo seleção dos pares diretor/fotógrafo, câmera/lente e resultados. A interface mostra Signature/Standard, Image Pro, presets e prompts parciais da galeria. As capturas de Statement identificam Image Pro (Runware) e Upscale (Magnific/Freepik). Não revelam o AIR ID, os prompts privados completos ou garantem o motor usado em cada resultado. As leituras da Tipó são originais; não são apresentadas como engenharia reversa exata.

### Refinamento a partir das referências já fornecidas

Nesta rodada posterior foram usadas as leituras de **seis capturas fornecidas por Daniel**, não um estudo do catálogo inteiro do ShotDeck. Não houve novo acesso/coleta do serviço, download de catálogo ou inclusão de suas imagens no repositório. Miniaturas permitem observar composição, distribuição tonal e relações de cor; não comprovam lente, estoque de película, LUT ou granulação de um frame em resolução original.

As mudanças são interpretações originais: hierarquia dos elementos já descritos, luz com origem crível, gradação de foco conforme a escala do plano e textura apropriada ao perfil. Naturalista preserva grão 35mm perceptível sem impor fundo dissolvido em planos abertos; Editorial permanece preciso e limpo; Experimental não transforma um pedido em cena musical nem empilha flare/bloom obrigatórios. Seis duplas conservam decisões distintas, sem substituir a distância explicitamente pedida.

Gate do refino: **1.160 verificações** (667 de refinamento, 198 looks, 34 autores, 46 modos, 70 visibilidade, 84 visualizador, 61 Studio), mais tools/audit. QC independente: 99 verificações em 28 cenários. Foram reexecutados isolamento de contas (9), Vertex (12), lotes (22) e bridge/concurrency com mocks. Nenhuma imagem real foi gerada. No briefing de cozinha padronizado, Naturalista ficou em 2.709 caracteres, Editorial em 2.425, Experimental em 2.539; os seis perfis autorais ficaram menores que no baseline. Comprimento não é métrica de qualidade fotográfica.

A revisão também cobre conflitos no compilador: altas luzes obedecem Cena/Ficha/Emulsão com autoridade tonal; recusas de efeitos ópticos atravessam os slots, sem considerar “sem halos” uma recusa de grão; layout explícito protege posições e intervalos. Os limites de conteúdo/arte compartilhados foram condensados para reduzir repetição, mantendo a precedência.

**Limitação preexistente de direções contraditórias:** o veto da Cena elimina efeitos dos defaults e seletores, mas não reescreve arbitrariamente a prosa livre da Ficha. Uma Cena “sem halos” junto de uma Ficha de textura que pede halation ainda pode enviar instruções conflitantes. Não prometer prioridade Cena > Ficha irrestrita; neste caso o usuário deve retirar a contradição. Preservar a Ficha literal evita apagar grão/material que compartilhe a mesma oração. Uma futura validação explícita de conflito deve ser testada separadamente.

Um baseline privado e um pós-refino com 27 combinações usam briefs e parâmetros idênticos. Isso permite inspecionar as mudanças de contrato sem reconstituir a versão anterior. **Não são imagens comparativas:** não houve geração real; o A/B depende da quantidade e do formato perguntados ao usuário. Depois do pedido de push, Daniel reafirmou que quer esconder o código das receitas e bloquear tentativas de extração; isso não é aceite de publicação com instruções expostas. A publicação depende de resolver a integração por usuário no backend. Ver [revisão de proteção](fotograma-recipe-security.md).

## O que estava errado e foi corrigido

| Área | Antes | Agora |
| --- | --- | --- |
| Create | “Sem grão” reescrito para grão fino; grão obrigatório e baseline de subexposição anexados | Brief não é reescrito para impor estética; um valor por slot, assinatura opcional |
| Altas luzes | Pedido explícito de clipping substituído pela regra da casa | Pedido preservado; proteção somente como default da assinatura |
| Enquadramento | “Em pé” podia impor corpo inteiro | Proteção de corpo inteiro somente quando explicitamente solicitado |
| Assistente Google | Reescrevia ideias até 1600 caracteres, mesmo com enriquecimento desligado | Somente ideias até 350, com enriquecimento ligado; original preservado antes das sugestões. Briefs longos seguem completos |
| Looks | Cinema/Publicidade/Music Video misturavam fotografia com intérprete, ação, cenário, figurino ou segmento comercial | Naturalista/Editorial/Experimental descrevem somente tratamento visual; conteúdo vem do brief/referências |
| Publicidade | Gênero injetava direção de produto/atleta/veículo e escondia controles manuais | Setores retirados; valores de gênero antigos são inertes; os três looks aceitam os mesmos controles |
| Ficha | Tradução intermediária podia perder valores; saída limitada | Valores literais, sem chamada extra de tradução |
| Referências | Mood em primeiro lugar deslocava referências numeradas | Conteúdo primeiro, estilo depois, numeração consistente; rótulos guardados no resultado |
| Animation | Preservação repetida; Clay impunha luz quente e foco macro | Uma cláusula de preservação; muda o meio sem forçar outra luz/câmera |
| Cast | Proibição absoluta de logos podia contrariar roupa pedida | Identidade protegida, lettering físico permitido quando solicitado |
| Product | Proibição de duplicação/acessórios brigava com sets explicitamente pedidos | Geometria e branding protegidos, conjunto/acessório explicitamente pedido permitido |
| Sheets | Escala única conflitava com painel de detalhe | Contagens/identidade protegidas, escala própria no detalhe do produto |

O limite de direção continua **12.000 caracteres**, sem corte silencioso. Os contratos Animation ficaram cerca de 42–45% menores; Sheets, 25–31%. Não se confunde contrato menor com limite menor de briefing.

## Uso local e superfícies removidas

**Uso**, no topo, abre somente o inventário local de resultados salvos por provedor, ferramenta e modelo. Não é uma fatura completa: excluídos, falhas e análises auxiliares não estão incluídos; preço ausente não vira US$ 0. Ainda não existe ledger de faturamento por conta.

Foram removidos os controles e painéis de prévia, leitura e cópia de prompts em Create, utilitários, cards e visualizador, além das abas de prompts e do catálogo técnico de perfis. Não se trata de ocultar elementos por CSS. O seletor de Diretores e sua nota curta continuam funcionando, sem expor ali as receitas.

Cards e busca usam o input original e metadados de ferramenta/modelo. `galleryOriginalBrief(take)` lê `params.scene` no Create e `params.brief` nos utilitários; nunca recorre ao prompt compilado. Quando falta esse input antigo, o reuso mantém o campo vazio. Os prompts históricos armazenados com os resultados permanecem intactos para compatibilidade, sem reconstruir o passado com presets novos e sem apagar dados pessoais. Download, curtida, reuso, Sheets, comparação e conexões permanecem disponíveis.

### Limite de confidencialidade e publicação

O repositório foi confirmado **público**. Retirar os leitores da interface reduz a exposição casual, mas **não torna confidenciais as instruções**: a compilação continua no cliente, o código entregue ao navegador e os pedidos enviados são inspecionáveis, e prompts de resultados antigos ainda existem no armazenamento local. Não foi implementado controle de acesso server-side nem migração/apagamento do histórico; esta revisão não deve ser descrita como proteção de segredo.

Daniel descreveu o fluxo desejado: input simples do usuário → backend com instrução específica do preset → Nano Banana Pro → galeria mostrando somente o input original. A migração ainda está em avaliação, inclusive sua compatibilidade com Higgsfield CLI local; não foi implementada nesta rodada.

Compilar na bridge local retiraria as instruções do JavaScript público, mas **não as esconderia do dono do computador**. Proteção real exigiria um backend Tipó com autorização apropriada que componha **e envie ao provedor** sem devolver a receita ou o prompt completo ao cliente, respeitando o isolamento de contas e o histórico existente. Tornar o repositório privado, isoladamente, também não protegeria código ainda entregue ao navegador. Migração das contas privadas e hospedagem continuam indefinidas; Daniel autorizou publicar o bloco atual mesmo com essa limitação, sem declarar concluída a arquitetura privada.

### Direção de Create

1. **Looks Tipó:** Naturalista (luz motivada, separação óptica contextual e grão 35mm irregular perceptível; halation local junto a altas luzes existentes), Editorial (formas claras e acabamento preciso) e Experimental (composição expressiva e contraste cromático). Defaults somente de fotografia; não definem personagens, ações, objetos, figurino ou cenário. IDs históricos `cinema`, `commercial` e `clipe` preservados; o texto de prompts já salvos não muda.
2. **Diretores:** Villeneuve/Deakins; Fincher/Cronenweth; Nolan/Van Hoytema; Anderson/Yeoman; Malick/Lubezki; Meirelles/Charlone. Cada um resolve composição, óptica, foco, luz, cor e textura, sem empilhar outro perfil. Direção de arte separada organiza apenas elementos existentes quando Cena/Ficha/referência de ambiente ou composição não controlam o layout. Diferenças e evidências em [identidade dos perfis](fotograma-auteur-sources.md). Não aplicar o mesmo grão, desfoque e halo a capturas digitais, 35mm, grande e pequeno formato.
3. **Modelo direto:** nome atual de `standard` (antes Somente meu brief), sem assinatura automática nem enriquecimento; referências e controles manuais continuam disponíveis. O clique intencional seleciona Higgsfield CLI e mantém um modelo Higgsfield já escolhido; catálogo inclui Nano Banana Pro, Nano Banana 2, Seedream 5 Lite/Pro e GPT Image 2. Não conecta/autentica uma conta nova. Restauração de take antigo/boot não troca o provedor Google salvo. Nos três caminhos, modelo real fica em Saída e conta/provedor em Conexões; trocar de estética não troca o motor escondido.

O motor continua identificado pelo nome real, recomendado **Nano Banana Pro**. O perfil não troca o modelo escondido, não usa Runware, não é fine-tune e não herda sua estética para Cast/Product/Sheets/Animation. Ficha/seletor explícito substitui o slot do perfil; diretivas escritas na Cena prevalecem sobre defaults. Identidade e design das referências continuam protegidos. A leitura semântica de slots é heurística: para direção incomum/ambígua, explicitar os controles e conferir o resultado visual.

**Enriquecer a cena** é uma opção independente e desligada para visitantes novos, com preferência explícita existente preservada. Seu assistente é neutro entre looks; não transforma um brief curto em apresentação musical ou campanha. Sem Google conectado, continua a compilação local. Mesmo com um contrato mais restrito, a aderência semântica de uma geração deve ser conferida no resultado — testes de strings não certificam ausência de alucinações.

- **Desligado:** a Cena segue literal; o compilador acrescenta somente direção selecionada e funções das referências. Grão, foco e luz não dependem do enriquecimento. Análise de referências/Emulsão pode usar Google independentemente desse toggle.
- **Ligado:** com Google e análise auxiliar habilitados, apenas ideias de até 350 caracteres recebem uma passagem de detalhamento. O original permanece antes das sugestões; há uma chamada extra de texto por lote. Briefs longos e Modelo direto não passam por ela. Falha do assistente mantém compilação local.
- **Direção avançada:** uma seleção atual por categoria, não histórico acumulado de cliques. Cena explícita prevalece; Ficha substitui a categoria correspondente; seletor substitui o default do look/perfil. A exceção existente de Emulsão≥50 continua: assume cor, luz e textura livres e coloca esses seletores em espera. Ficha/Cena explícitas continuam prioritárias. A interface agora avisa sobre essa interferência e seleções mantidas de outros perfis.
- **Revisão visual:** comparar os resultados e conferir os parâmetros selecionados; a UI não mostra mais a compilação. O resultado continua guardando internamente o texto realmente enviado, sem reconstruir o passado com presets novos. Pedidos explícitos de fundo em foco/desfocado e de ausência de flare/bloom anulam os defaults correspondentes.

### Visualizador e comparação

Setas visíveis e ←/→ percorrem apenas imagens concluídas do filtro atual, sem circular nos limites; contador acompanha novas chegadas. **Comparar** fixa B e permite navegar A, pulando a imagem de referência. B é selecionável entre os outros resultados; download, curtida, reuso, Sheets e exclusão se referem somente a A. As duas imagens usam contain sem deformação, lado a lado no desktop e empilhadas no celular. Não há mistura, alinhamento artificial nem regravação dos originais.

Com menos de duas imagens, comparação fica desabilitada com explicação. Se B desaparecer do filtro/galeria, comparação encerra com aviso. X/Escape e foco por teclado preservados. Corrigida exclusão não durável: o resultado só some após o commit do IndexedDB; falha mantém a imagem, e reload imediato não a ressuscita.

## Conexões e isolamento

Seleção de provedor e campos de conexão saíram dos parâmetros para **Conexões**, no canto superior direito. Modelo, resolução e proporção permanecem em Saída.

- Visitante novo: chave vazia, sem probes/autovinculação de Higgsfield ao navegar nas ferramentas. Conectar é uma ação explícita.
- Visitante em outro computador: loopback aponta para o próprio computador, não para a conta de Daniel.
- Perfil já autorizado: reconexão automática preservada; não apaga chave/galeria/sessão existente.
- **Desconectar este navegador:** interrompe reconexão e impede uma preparação em andamento de reautorizar a conta. Não cancela jobs já enviados e não desloga o CLI. Esquecer Google invalida resposta tardia. Ambos se propagam às outras abas do perfil.
- Sessão expirada durante a preparação de uma ferramenta conserva o status 401 e o botão Entrar; não é reclassificada como falha de transporte e não agenda probes inúteis. Corrigido na regressão final de reconexão.
- Bridge: adapter rejeita host remoto inclusive HTTPS; servidor recusa bind LAN/público. O processo já aberto não foi reiniciado; a proteção de bind entra no próximo início.
- Credenciais: fora de prompts/snapshots/links; `data-noshare` continua valendo ao mostrar a chave pelo olho. Google usa header, não URL. Isso é separado da confidencialidade das instruções de geração.

**Limite importante:** preferência de conexão não é autenticação multiusuário. Outro perfil no mesmo Mac pode acessar a conta do CLI daquele usuário do sistema se decidir conectar. Quem compartilha o mesmo perfil também compartilha localStorage/IndexedDB. Para uso público multiusuário em servidor, será preciso sessão por pessoa e cofre de credenciais; a bridge atual não deve ser exposta publicamente.

## Magnific / Upscale — pendência real

Pesquisa e contrato: [proposta de integração](fotograma-magnific-integration.md). API REST e MCP/OAuth oficiais existem na plataforma atual; a reutilização de uma assinatura `magnific.ai` Legacy não foi confirmada. Aguardando identificação da conta de Daniel antes de autenticar ou habilitar. Sem botão falso e sem envio de imagem. O futuro fluxo precisa preservar o arquivo original (não usar a redução de referências a 2048px), mostrar antes/depois e distinguir reconstrução criativa de precisão.

## Verificação

- Rodada final com defesa de entrada: **1.413 verificações contadas + audit ALL PASS**, incluindo 137 do novo `test-fotograma-input-guard.mjs`. Validação independente AppSec: 16 verificações/8 casos. Zero chamadas reais a provedores e zero CLI autenticado; a bridge pessoal não foi reiniciada. Isso verifica bloqueio de casos de intenção e os fluxos de envio, não confidencialidade das receitas. [Escopo, limites e arquitetura pendente](fotograma-recipe-security.md).
- `node test-fotograma-looks.mjs`: **198 checks**, três looks/briefs, conteúdo literal, prioridades, grão Naturalista recuperado sem imposição global, foco explícito, arte com autoridade limitada, sem flare/bloom, histórico, enriquecimento e mobile.
- `node test-fotograma-creation-modes.mjs`: **46 checks**, três caminhos públicos, seleção intencional Higgsfield, modelos reais, restauração Google, opt-in existente e visitantes sem probes, sem enriquecimento em Modelo direto, desktop/mobile.
- `node test-fotograma-lightbox.mjs`: **84 checks**, A/B, navegação filtrada, foco, ações sobre A (incluindo pixels/bytes enviados ao Sheets), novas chegadas, exclusão/reload e mobile.
- `node test-fotograma-auteur.mjs --browser`: **34 checks**, seis identidades/arte/imunidade a mutação/limites e compilador real.
- `node test-fotograma-studio.mjs`: **61 checks**, Uso local desktop/mobile, compilador/slots/overrides preservados, numeração, escaping, persistência, foco, layout sem sobreposição, contraste ≥4,5:1 em Conexões nos dois temas e nenhuma chamada de provedor.
- `node test-fotograma-prompt-visibility.mjs`: **70 checks**, ausência das superfícies de leitura/cópia/preview, sem exposição de prompt sentinela na UI ou busca, input original de Create/utilitários corretamente exibido e pesquisável, brief legado ausente tratado corretamente e prompt histórico preservado exatamente no IndexedDB/reload. Zero chamadas a provedor. Não é um teste de confidencialidade do código cliente.
- `node test-fotograma-tool-contracts.mjs --browser`: **28/28**, contratos literais/12k, preservação, fontes e catálogo imutável.
- `node test-fotograma-account-isolation.mjs`: **9/9**, visitantes separados, opt-in legado, disconnect/forget/health tardio/Google tardio, abas e links.
- `node test-connector-safety.mjs`: **12/12**. Bridge/CORS: **13 checks**.
- `node test-fotograma-audit.mjs` e `node test-fotograma-tools.mjs`: **ALL PASS**; fixtures agora conectam explicitamente.
- `node test-fotograma-vertex.mjs`, `node test-fotograma-batch.mjs` e `node test-fotograma-higgsfield-reconnect.mjs`: **ALL PASS** na validação final. Fila contínua, quatro jobs ativos, histórico com mais de 30 imagens, preparação única por lote, Vertex sem fallback pago, opt-in e sessão expirada preservados. Fixtures de reconexão representam um perfil já autorizado; visitantes novos continuam cobertos pela suíte de isolamento.
- `node test-video-reference-ui.mjs`: **32/32**, exportações GIF/JPG decodificadas e navegação do workspace preservada.
- Sintaxe dos scripts e `git diff --check`: sem erros.

Nesta retirada de UI, Studio, prompt-visibility, looks, modos, lightbox, auteur, ferramentas e auditoria passaram novamente. Os demais resultados acima registram as regressões já executadas na rodada; não são uma nova geração real.

Validação conjunta de Imagem & Efeitos: framing Full HD **86/86**, tonal **73/73**, motion **67/67**, workspaces **8/8**, home **28/28** e previews cinéticos **38/38**. A suíte `test-production.mjs` compara 34 arquivos implantados com os locais e testa o Fotograma publicado em desktop/mobile, com visitante novo sem probes de contas; faz parte da verificação do deploy agora autorizado.

Os testes de conectores usam respostas simuladas, não a conta real. **Nenhuma imagem paga foi gerada.** Não foi comprovada a fidelidade estética dos seis perfis com uma rodada comparativa; o próximo gate criativo é testar o mesmo brief/referências em Nano Banana Pro e comparar composição, luz, identidade e materiais. Não prometer uma reprodução idêntica do colega, de um filme ou de um equipamento.
