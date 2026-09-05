# Tipó — auditoria e evolução do hub criativo

Data: 5 de setembro de 2026. Escopo: 41 ferramentas + página inicial, código, navegador desktop/mobile, interface compartilhada, Fotograma, prompts e integrações.

## Resultado executivo

A Tipó passou a abrir em um hub visual de acesso imediato. As ferramentas existentes foram preservadas, com base de controles mais legível e correções funcionais nos pontos em que a auditoria encontrou falhas reproduzíveis. O Fotograma recebeu revisão de prompts por função, proteção das operações em andamento e integração mais previsível com Google/Higgsfield.

Não foi usado um teste simulado como prova de qualidade de IA. A sessão Higgsfield foi verificada de verdade, mas as gerações de regressão usam fixtures. A cota/faturamento de uma chave Google particular e a qualidade estética de cada modelo continuam exigindo uma prova real separada.

## Achados e ações

| Área | Problema | Resultado implementado |
| --- | --- | --- |
| Entrada | A navegação multinível e a introdução escondiam ferramentas usadas diariamente | Destaques Fotograma/Studio/Kinetic, 41 ferramentas na mesma página, busca, filtros e acesso por teclado |
| Descoberta | Descrições antigas, sem busca ou caminhos de retorno rápidos | Descrições em português, metadados de mídia/exportação, favoritas e recentes por navegador |
| Identidade | Excesso de movimentos decorativos e hierarquia tipográfica fraca | Layout editorial, Clash Display + General Sans, paleta Tipó preservada, destaque para resultados visuais |
| Performance da home | GSAP, vários canvases e vídeos decorativos | Sem dependência externa de script/font na home; vídeo opt-in, thumbnails WebP/lazy e SVGs estáticos |
| UI compartilhada | Textos auxiliares pouco contrastados, ações de 9–10px, controles sem teclado | Tokens de contraste, inputs/ações ampliados, fontes locais, foco visível, chips e bottom sheet com teclado |
| Clareza | Pílula `FREE` confundia formato livre com gratuidade | Texto `Formato livre`, com nome acessível |
| Fotograma | Briefs cortados, instruções de edição conflitantes, operação mudando ao trocar aba | Limite12k explícito, contratos por ferramenta, prévia, snapshot imutável, progresso e proveniência |
| Multi Angle | Motor `qwen_camera_control` ausente no CLI atual | Retirado do rail ativo, bloqueio anterior a qualquer job pago |
| Google | Retry/troca de modelo e regeneração por tamanho podiam elevar custo | Modelo escolhido preservado; resposta concluída ou incerta não dispara outra geração |
| Higgsfield | Flag GPT2 removida e download sem limites suficientes | Contrato atualizado; download com timeout, limite de bytes, tipos raster e validação de redirects |
| Vessel | Overshoot Elastic produzia raio negativo e quebrava a animação | Raio limitado à geometria válida; dois presets ganharam contraste |
| Depth Map | Drop durante análise podia substituir o vídeo; preset pouco explicado | Source travada durante processamento, upload central, explicação de presets e cancelamento testado |
| Studio | Ações pequenas, viewport impedindo zoom e ajuda sem pontos de entrada | Barra, controles de efeito e zoom maiores; zoom de acessibilidade liberado e ajuda de fonte/stack/parâmetros restaurada |

## Direção visual aplicada

- Creme, carvão, verde-petróleo e dourado continuam sendo a identidade da Tipó; não houve rebranding genérico.
- A tipografia de interface passa a ser sans legível. Monoespaçada permanece em valores e metadados. A tipografia/pixels gerados por cada ferramenta não mudam com o tema da UI.
- A home usa uma saída Fotograma existente, otimizada em um arquivo novo, e seis prévias exportadas pelos motores da Tipó. As ilustrações tipográficas de navegação não são promessas de saída pixel a pixel.
- Os temas claro/escuro e os layouts de 320 a 1920px foram inspecionados. O movimento promocional só começa por ação explícita e pausa fora da tela ou com a aba escondida.
- Preservadas as páginas e rotas existentes, os backlinks `#visual`, `#kinetic`, `#3d`, `#2d`, `#composition` e `#animation`, as galerias e os arquivos pessoais.

## Verificação reproduzível

| Teste | O que verifica | Resultado |
| --- | --- | --- |
| `node test-hub.mjs` | 41 rotas, filtros, busca com acentos, favoritas, storage corrompido/bloqueado, recentes, teclado, temas e cinco larguras | 28 checks PASS |
| `node test-platform-smoke.mjs` | 40 ferramentas não-Fotograma × desktop/mobile; boot, assets, preset, canvas, upload quando necessário, exportação PNG e sheet | 80/80 PASS; 39 PNGs válidos |
| `node test-platform-smoke.mjs --tools=studio,dithering,gradientmap,rastro,riso,audiotype` | Revalidação após últimos ajustes de controles específicos | 12/12 PASS |
| `node test-vessel.mjs` | 1.800 frames, 10 easings × 3 tamanhos, contraste de presets | PASS |
| `node test-studio.mjs` | 20 efeitos reais, receitas, composição de frames, reordenação, bypass, zoom/pan, PNG e MP4 decodificado | PASS |
| `node test-tipohelp.mjs` | Ajuda nas 33 ferramentas do registro, teclado, Escape, posição e isolamento dos sistemas próprios | PASS |
| `node test-depthmap.mjs` | Preview, cancelamento, MP4 automático, duração, geometria, grayscale, ordem temporal e suavização | PASS; somente inferência neural substituída por fixture |
| `test-mobile-ux`, `test-mobile-split`, `test-mobile-upload` | Upload por toque, formato, fullscreen, sheet sem cobrir canvas, mobile | PASS |
| `test-fotograma-audit`, `test-fotograma-tools` | Prompts utilitários, snapshots, limites, drop, galeria, preview, inspector e capacidade | PASS com provedores simulados |
| `test-fotograma-prompt`, `test-fotograma-v3` | Programas, gêneros, referências, Ficha, Emulsão e resolução de conflitos | PASS com provedores simulados |
| `test-fotograma-batch` | Cliques sucessivos, quatro ativos + fila, sem perda de prompt, galeria com mais de30 após reload | PASS com provedor simulado |
| `test-fotograma-vertex`, `test-fotograma-res` | Rota Express, chave no header, formato/resolução, no-retry e modelo determinístico | PASS com Google simulado |
| `test-connector-safety`, `test-higgsfield-bridge`, `test-higgsfield-bridge-concurrency` | Segurança, limites, origem, OAuth/fila, erros e slots | PASS; servidor real, CLI/downloads simulados |
| `test-fotograma-higgsfield-reconnect` | Queda/retomada, OAuth, adapter correto, fila e não duplicar POST | PASS com bridge simulado |
| `test-fotograma-higgsfield-live` | Origem produção → bridge/conta reais, saldo, botão habilitado, sem login/popup | PASS; somente leitura |

Artefatos da rodada completa: `/var/folders/ds/ddq8z3px26b7nmflr6p28lw00000gn/T/tipo-platform-audit-IPBVlQ/report.json`. A repetição dos controles específicos fica em `tipo-platform-audit-TDah8s/report.json`, no mesmo diretório temporário pai. Os scripts produzem novas pastas a cada execução, sem alterar galerias ou imagens pessoais.

## O que não está certificado

1. **Qualidade visual de IA:** requer gerar e julgar saídas reais por modelo/seção. Os prompts foram auditados, não tratados como garantia de fidelidade, tipografia ou identidade.
2. **Google particular:** contrato validado; a chave, permissões, faturamento e cota reais dependem da conta do usuário.
3. **Conexão Higgsfield remota:** o bridge é local ao Mac. Outro computador/celular não acessa esse loopback. OAuth continua sujeito a expiração/revogação do provedor.
4. **Unlimited:** o CLI consome créditos; o benefício do site não se transfere para essa integração. [Documentação oficial Higgsfield](https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-access-higgsfield-via-cli).
5. **Backup:** IndexedDB preserva a galeria local, mas limpar os dados do site pode removê-la. Backup/restauração em lote e nuvem são melhorias futuras, não recursos implementados aqui.
6. **Compatibilidade:** Chromium desktop e viewport mobile foram exercitados, além do upload mobile em WebKit; isso não equivale a testes em hardware iOS/Safari/Firefox, câmera/microfone reais ou cargas longas de IA em cada GPU.
7. **Acessibilidade:** melhorias de contraste/teclado/rótulos verificadas, sem alegar certificação WCAG completa nas41 ferramentas. Ainda existem textos/painéis legados em inglês e controles avançados densos, especialmente Dithering e Studio.

## Detalhamento

- [Fotograma: prompts, UI e proveniência](audit-fotograma-2026-09.md)
- [Conectores: contratos, segurança, fontes e limitações](audit-connectors-2026-09.md)

Os squads de design, desenvolvimento e audiovisual orientaram as mudanças. O critério foi preservar identidade e fluxos úteis, corrigir falhas reproduzíveis e não disfarçar indisponibilidade ou custo de provedor com interface.
