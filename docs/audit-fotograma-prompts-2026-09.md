# Fotograma — prompts, direção e contas

Revisão de 05/09/2026. Após inspecionar a prévia, Daniel aprovou os ajustes de looks e o commit/push conjunto com Imagem & Efeitos. As evidências abaixo distinguem os testes de software da qualidade dos modelos de IA; aprovação de publicação não equivale a validação estética por geração real.

## Evidência da referência

Inspecionada a gravação de 2min14s fornecida por Daniel, incluindo seleção dos pares diretor/fotógrafo, câmera/lente e resultados. A interface mostra Signature/Standard, Image Pro, presets e prompts parciais da galeria. As capturas de Statement identificam Image Pro (Runware) e Upscale (Magnific/Freepik). Não revelam o AIR ID, os prompts privados completos ou garantem o motor usado em cada resultado. As leituras da Tipó são originais; não são apresentadas como engenharia reversa exata.

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

## Revisão dentro da interface

**Prompts & uso**, no topo, abre três visões:

- **Prompts:** Create compilado, Cast, Product, Sheets, Animation; parâmetros de Expand/Remove BG; systemInstruction do assistente, Emulsão e análise de referências; Ficha literal. Separação entre prévia e prompt realmente enviado, registrado com a imagem. Dados inseridos como texto, não HTML executável.
- **Uso local:** conta resultados salvos por provedor, ferramenta e modelo. Não finge ser fatura completa: excluídos/falhas/análises auxiliares não estão incluídos; preço ausente não vira US$ 0. Ainda não existe ledger de faturamento por conta.
- **Perfis de cinema:** seis pares, instruções visuais reais e fontes abertas. Câmeras são notas de produções específicas, não uma falsa simulação de hardware.

### Direção de Create

1. **Looks Tipó:** Naturalista (luz motivada e textura sutil), Editorial (formas claras e acabamento preciso) e Experimental (composição expressiva e contraste cromático). Defaults somente de fotografia; não definem personagens, ações, objetos, figurino ou cenário. IDs históricos `cinema`, `commercial` e `clipe` preservados; o texto de prompts já salvos não muda.
2. **Somente meu brief:** sem assinatura automática; referências e controles manuais continuam disponíveis. Não chama o assistente de enriquecimento.
3. **Diretor + fotografia:** Villeneuve/Deakins; Fincher/Cronenweth; Nolan/Van Hoytema; Anderson/Yeoman; Malick/Lubezki; Meirelles/Charlone. Cada um resolve composição, óptica, foco, luz, cor e textura, sem empilhar outro perfil. Fontes e filmografia em `shared/fotograma-direction.js`; Cidade de Deus inclui crédito de codireção de Kátia Lund.

O motor continua identificado pelo nome real, recomendado **Nano Banana Pro**. O perfil não troca o modelo escondido, não usa Runware, não é fine-tune e não herda sua estética para Cast/Product/Sheets/Animation. Ficha/seletor explícito substitui o slot do perfil; diretivas escritas na Cena prevalecem sobre defaults. Identidade e design das referências continuam protegidos. A leitura semântica de slots é heurística: para direção incomum/ambígua, conferir o prompt compilado.

**Enriquecer a cena** é uma opção independente e desligada para visitantes novos, com preferência explícita existente preservada. Seu assistente é neutro entre looks; não transforma um brief curto em apresentação musical ou campanha. Sem Google conectado, continua a compilação local. Mesmo com um contrato mais restrito, a aderência semântica de uma geração deve ser conferida no resultado — testes de strings não certificam ausência de alucinações.

## Conexões e isolamento

Seleção de provedor e campos de conexão saíram dos parâmetros para **Conexões**, no canto superior direito. Modelo, resolução e proporção permanecem em Saída.

- Visitante novo: chave vazia, sem probes/autovinculação de Higgsfield ao navegar nas ferramentas. Conectar é uma ação explícita.
- Visitante em outro computador: loopback aponta para o próprio computador, não para a conta de Daniel.
- Perfil já autorizado: reconexão automática preservada; não apaga chave/galeria/sessão existente.
- **Desconectar este navegador:** interrompe reconexão e impede uma preparação em andamento de reautorizar a conta. Não cancela jobs já enviados e não desloga o CLI. Esquecer Google invalida resposta tardia. Ambos se propagam às outras abas do perfil.
- Sessão expirada durante a preparação de uma ferramenta conserva o status 401 e o botão Entrar; não é reclassificada como falha de transporte e não agenda probes inúteis. Corrigido na regressão final de reconexão.
- Bridge: adapter rejeita host remoto inclusive HTTPS; servidor recusa bind LAN/público. O processo já aberto não foi reiniciado; a proteção de bind entra no próximo início.
- Segredos: fora de prompts/snapshots/links; `data-noshare` continua valendo ao mostrar a chave pelo olho. Google usa header, não URL.

**Limite importante:** preferência de conexão não é autenticação multiusuário. Outro perfil no mesmo Mac pode acessar a conta do CLI daquele usuário do sistema se decidir conectar. Quem compartilha o mesmo perfil também compartilha localStorage/IndexedDB. Para uso público multiusuário em servidor, será preciso sessão por pessoa e cofre de credenciais; a bridge atual não deve ser exposta publicamente.

## Magnific / Upscale — pendência real

Pesquisa e contrato: [proposta de integração](fotograma-magnific-integration.md). API REST e MCP/OAuth oficiais existem na plataforma atual; a reutilização de uma assinatura `magnific.ai` Legacy não foi confirmada. Aguardando identificação da conta de Daniel antes de autenticar ou habilitar. Sem botão falso e sem envio de imagem. O futuro fluxo precisa preservar o arquivo original (não usar a redução de referências a 2048px), mostrar antes/depois e distinguir reconstrução criativa de precisão.

## Verificação

- `node test-fotograma-looks.mjs`: **171 checks**, três looks e briefs contrastantes, conteúdo literal, instrumento explicitamente pedido, prioridade dos seis slots, gênero antigo inerte, reuso sem mutar take, modos sem empilhar, enriquecimento neutro/off/persistência e mobile.
- `node test-fotograma-studio.mjs`: **69 checks**, UI desktop/mobile, seis perfis/slots/overrides, sem grão, numeração, prompt realmente salvo, escaping, persistência, foco, layout sem sobreposição, contraste ≥4,5:1 em Conexões nos dois temas e nenhuma chamada de provedor.
- `node test-fotograma-tool-contracts.mjs --browser`: **28/28**, contratos literais/12k, preservação, fontes e catálogo imutável.
- `node test-fotograma-account-isolation.mjs`: **9/9**, visitantes separados, opt-in legado, disconnect/forget/health tardio/Google tardio, abas e links.
- `node test-connector-safety.mjs`: **12/12**. Bridge/CORS: **13 checks**.
- `node test-fotograma-audit.mjs` e `node test-fotograma-tools.mjs`: **ALL PASS**; fixtures agora conectam explicitamente.
- `node test-fotograma-vertex.mjs`, `node test-fotograma-batch.mjs` e `node test-fotograma-higgsfield-reconnect.mjs`: **ALL PASS** na validação final. Fila contínua, quatro jobs ativos, histórico com mais de 30 imagens, preparação única por lote, Vertex sem fallback pago, opt-in e sessão expirada preservados. Fixtures de reconexão representam um perfil já autorizado; visitantes novos continuam cobertos pela suíte de isolamento.
- `node test-video-reference-ui.mjs`: **32/32**, exportações GIF/JPG decodificadas e navegação do workspace preservada.
- Sintaxe dos scripts e `git diff --check`: sem erros.

Validação conjunta de Imagem & Efeitos: framing Full HD **86/86**, tonal **73/73**, motion **67/67**, workspaces **8/8**, home **28/28** e previews cinéticos **38/38**. A suíte `test-production.mjs` compara os arquivos implantados com os locais e testa o Fotograma publicado em desktop/mobile, com visitante novo sem probes de contas; deve rodar após o deploy.

Os testes de conectores usam respostas simuladas, não a conta real. **Nenhuma imagem paga foi gerada.** Não foi comprovada a fidelidade estética dos seis perfis com uma rodada comparativa; o próximo gate criativo é testar o mesmo brief/referências em Nano Banana Pro e comparar composição, luz, identidade e materiais. Não prometer uma reprodução idêntica do colega, de um filme ou de um equipamento.
