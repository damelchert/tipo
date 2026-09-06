# Fotograma — exposição das receitas e pedidos de extração

Revisão defensiva local, 2026-09-05. Escopo autorizado: código da Tipó, testes isolados e desenho de proteção. Fora de escopo: atacar terceiros, coletar ShotDeck, extrair credenciais, migrar contas ou provisionar infraestrutura sem definição do fluxo.

## Resumo

A receita visual deve ser tratada como propriedade do produto, não como credencial ou controle de autorização. Retirar “ver prompt” protege a apresentação da galeria, não o código enviado ao navegador. Bloquear pedidos de extração é uma mitigação adicional; não torna o prompt impossível de descobrir.

A [OWASP sobre system prompt leakage](https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/) recomenda manter segredos e controles de autorização fora das instruções do modelo. A [orientação de prevenção de prompt injection](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) orienta defesa em camadas, separação de dados/instruções, validação de entrada e saída e limites claros de confiança. Não se promete bloqueio perfeito por expressão regular.

## Achados e medidas

Severidades são qualitativas relativas ao objetivo de proteger as receitas, não uma pontuação CVSS de comprometimento de contas.

| Prioridade | Evidência no código | Impacto | Medida necessária |
| --- | --- | --- | --- |
| Alta — exposição direta da receita | `PROGRAMAS` e `resolvePrompt` em `fotograma.html`; perfis em `shared/fotograma-direction.js` | A receita pode ser lida sem pedir nada ao modelo | Backend privado compõe e envia ao provedor; frontend recebe somente resultado/status/metadados públicos. Código privado não deve estar no repositório público nem no bundle |
| Alta — limite do CLI local | Bridge recebe `body.prompt` e o usa como argumento do processo CLI | O dono do computador consegue inspecionar a receita enviada | Não vender a bridge local como armazenamento confidencial; definir um caminho de provedor executado no servidor para receitas privadas |
| Média — filtro incompleto e contornável | `looksLikeInjection` existia no clique Create; Ficha, utilitários e acesso direto exigem revisão própria | Pedidos de extração podem chegar aos caminhos não cobertos | Validação antes de fila/análise/envio e no endpoint; resposta genérica sem eco de conteúdo |
| Média — falsos positivos do filtro anterior | Regras isoladas para `copie`, `instrução` e `folha em branco` | Briefs visuais legítimos são recusados | Detectar intenção de acesso a instruções internas, com casos benignos de regressão |
| Informativa — histórico preservado | Takes antigos mantêm `params.prompt` no armazenamento do navegador | A remoção de leitores não apaga dados já entregues | Não apagar o histórico sem autorização; migração precisa de tratamento explícito dos dados antigos |

## Separação de responsabilidades

O navegador deve enviar o input do usuário, ID do preset e controles públicos. Um backend privado deve validar o pedido, autorizar a conta correta, compor a direção, chamar o provedor e devolver somente imagens, status e metadados permitidos. Chaves não entram no prompt, em logs de conteúdo ou nos resultados salvos.

O fluxo atual ainda é compilação no cliente com Google direto ou CLI local. Não existe neste projeto uma camada privada implantada com sessão multiusuário/cofre. Mudar esse fluxo afeta onde as credenciais são usadas e como o usuário autoriza o provedor; não é uma simples mudança visual. Não expor a bridge do Daniel na internet nem compartilhar sua conta com visitantes.

Google admite o uso da API a partir de backend; neste produto, passar uma chave própria pelo servidor exigiria consentimento e uma política explícita de não armazenamento/redação de logs, sem fallback para conta da Tipó. [Documentação Google](https://ai.google.dev/gemini-api/docs/api-key).

O Higgsfield documenta MCP com OAuth, usando a conta de quem autoriza. Isso não demonstra, por si, uma integração SaaS multiusuário pronta para a Tipó; registro, autorização e isolamento precisam ser validados. A documentação confirma resultados em Assets, mas não foi confirmado se o titular consegue consultar o prompt completo nesses metadados. Backend reduz exposição no produto, não garante segredo absoluto perante o provedor ou o titular da conta. [Documentação Higgsfield](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp).

**Cobrança:** a documentação Higgsfield de 01/08/2026 declara que CLI/MCP e outras gerações programáticas consomem créditos; Unlimited/free ficam restritos ao site. Isso diverge da anotação local antiga de Unlimited no CLI. Não foi feita geração para testar cobrança nem alterada a conta; futuras autorizações de teste devem considerar esse custo. [Regra oficial atual](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp).

Escolha de produto enviada ao Daniel: validar Higgsfield privado por usuário antes de mudar o motor dos looks, ou usar Google/Vertex no backend para os looks públicos, preservando o CLI no uso pessoal/direto. Não remover Looks/Diretores para visitantes nem trocar seu motor automaticamente como atalho de segurança.

## Defesa complementar implementada

`shared/fotograma-input-guard.js` compartilha a validação entre navegador e Node. A detecção normaliza Unicode, acentos e caracteres invisíveis sem reescrever o input criativo; procura intenção de extrair/burlar instruções internas, receitas e código do sistema. Não faz chamadas a IA, decodificação arbitrária ou login. A mensagem de recusa é fixa e não repete input, receita ou credencial.

Create verifica Cena e todos os campos da Ficha antes de análises/fila; os quatro utilitários geradores verificam seus briefs. Preparação e caminhos de envio revalidam os snapshots, inclusive depois de uma espera. `validateGenerate` também verifica o prompt recebido pela bridge antes de reservar slots, criar arquivos ou executar o CLI. Palavras isoladas como “copie”, “instruções” e “folha em branco” não são bloqueadas por si.

O processo pessoal da bridge não foi reiniciado: a proteção dessa rota vale para um novo processo com o código atualizado. A suíte inicia apenas uma bridge isolada, com spawn substituído, sem executar o CLI real. Navegador direto e código local controlados pelo próprio usuário não constituem uma fronteira confiável. Paráfrases não cobertas e instruções embutidas em mídia continuam riscos; a validação não é autenticação nem prova de sigilo.

Verificação: `node test-fotograma-input-guard.mjs`, **137 checks**, com 24 variantes recusadas e 11 benignas, Node/browser, Ficha, utilitários, caminhos diretos, espera assíncrona e POSTs de fixture à bridge. QC independente das variantes finais: 16 verificações/8 casos. Gate combinado de segurança/looks/UI/conectores: 1.413 verificações + auditoria, sem falhas. Erros não repetem o input e o stub de processo não executou o CLI autenticado. O teste de produção foi preparado para verificar também o arquivo novo, mas não rodou: não houve deploy.

## Estado desta rodada

Refino de looks e defesa de entrada concluídos; backend privado ainda não implementado. Após ser informado desse limite, Daniel autorizou expressamente o push do bloco atual (“faz push e vamo ser feliz”). A suspensão anterior foi encerrada. A liberação não muda a visibilidade do GitHub, conta ou chave, e não equivale a proteger o código cliente.

**Histórico Git também importa:** remover as receitas do último arquivo não as remove de commits anteriores. A publicação autorizada deste bloco inclui as receitas atuais no código/histórico público. A futura migração deve separar artefatos públicos e privados, sem prometer que recuperará o sigilo do que já foi disponibilizado: conteúdo publicado pode persistir em clones/caches.
