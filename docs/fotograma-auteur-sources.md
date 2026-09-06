# Fotograma — identidade dos perfis de direção

Revisão: 2026-09-05. Audiovisual-squad (direção de fotografia, arte e QC) + dev-squad (contratos e regressão).

Estado da liberação: o painel técnico de prompts/perfis foi retirado da interface; **Uso** contém somente o inventário local. O seletor de Diretores conserva uma nota curta sobre o perfil. Esta mudança não torna o código cliente confidencial, e os prompts históricos não foram apagados. Daniel autorizou a publicação no repositório público após informado desse limite; backend privado ainda não implementado. Ver [auditoria e limites](audit-fotograma-prompts-2026-09.md).

Galeria e busca usam apenas input original (`scene` no Create, `brief` nos utilitários), nunca a receita compilada. Os 70 checks de visibilidade passaram sem chamadas a provedor. Mover a compilação para a bridge local não a esconderia do dono do computador: proteção efetiva requer backend Tipó compondo e enviando ao provedor sem devolver a receita. Hospedagem e migração das contas privadas ainda não definidas; checkpoint Git local não equivale a publicação.

## Critério

Os seis perfis são interpretações visuais da Tipó, não simulações físicas de câmera, presets oficiais ou uma fórmula para a filmografia inteira. Cada perfil declara um filme de referência. Equipamento permanece como contexto histórico das fontes deste documento, fora do prompt enviado ao modelo; o antigo catálogo técnico não está mais na interface. O texto do usuário, controles manuais, ficha e referências continuam tendo prioridade.

“Cinematográfico” não significa aplicar o mesmo grão, desfoque e halo a todas as imagens. O perfil agora precisa mudar decisões observáveis. A direção de arte foi separada dos seis slots fotográficos: trata apenas de hierarquia, intervalos e sobreposição **dos elementos existentes**. Não pode introduzir cenário, acessórios, figurino, desgaste ou uma paleta que escaparia dos controles de cor.

## Evidência e interpretação

| Perfil / recorte | Evidência primária | Decisão visual da Tipó e limite |
| --- | --- | --- |
| Villeneuve + Deakins / *Blade Runner 2049* | Deakins descreve referências arquitetônicas, espaços severos, luz incidindo em formas grandes e os tratamentos cromáticos por ambiente. Captura digital ALEXA / Master Primes confirmada pela ARRI. | Área negativa e escala, recorte luminoso escultural, campos cromáticos densos e profundidade legível. Digital limpo; não adicionar grão, halation, futurismo ou névoa. Âmbar/slate é um recorte cromático autoral, **não** a cor de todas as cenas do filme. [Entrevista ASC](https://theasc.com/article/uncanny-valley-blade-runner-2049/), [ARRI](https://www.arri.com/news-en/lighting-blade-runner-2049-/45572-45572). |
| Fincher + Cronenweth / *Gone Girl* | A ASC documenta RED Dragon e Summilux-C; o perfil de Cronenweth discute exposição baixa, luz de topo/borda e sua resistência a uma receita pessoal universal. | Quadro milimétrico, foco seletivo contido, sombras modeladas, cor dessaturada e detalhe digital. Sem grão, halation ou haze adicionados. A composição e os neutros frios são interpretação, não alegação de uma LUT histórica fixa. [Galeria e equipamento](https://theasc.com/article/ac-gallery-gone-girl/), [Entrevista ASC](https://theasc.com/article/cronenweth-adventurous-eye/). |
| Nolan + Hoytema / *Oppenheimer* | Hoytema explica proximidade nos closes com visão periférica, ópticas adaptadas para foco próximo, mistura de negativo 65mm e grão mais fino pela área de negativo. Luz deveria parecer vir de fontes críveis. | Proximidade dimensional, bokeh graduado **em planos próximos** e espaço retido nos abertos. Grão fino perceptível; halation quente pequena só junto a altas luzes intensas. O halo é uma interpretação controlada da resposta fotoquímica, **não** uma afirmação de filtro aplicado no set. [Entrevista Kodak](https://www.kodak.com/en/motion/blog-post/oppenheimer/). |
| Anderson + Yeoman / *The French Dispatch* em cor | Yeoman confirma 35mm, Cooke S4, grão como parte importante do look e iluminação suficiente para trabalhar em F11 e manter os planos legíveis. O filme também contém P&B e exceções ópticas. | Tableau frontal e equilibrado, foco profundo, agrupamentos ritmados e blocos de duas/três famílias de cor. Grão fino visível e contraste arredondado; não miniaturizar, plastificar ou transformar pessoas em caricaturas. Cor é interpretação do recorte em cor, não de todo o filme. [Entrevista Kodak](https://www.kodak.com/en/motion/blog-post/the-french-dispatch/). |
| Malick + Lubezki / *The Tree of Life* | Lubezki relata abordagem documental, luz quase sempre disponível, câmera próxima da ação e mistura 35/65mm/IMAX; usou ópticas esféricas. Não se tratava de colocar um softbox uniforme sobre a cena. | Amplitude próxima e assimétrica, camadas orgânicas, transição luminosa natural e grão fino. Flare velado apenas se uma contraluz **existente** incidir na lente: interpretação óptica, não filtro obrigatório documentado. Não inventar pôr do sol, natureza ou janelas. [Entrevista British Cinematographer](https://britishcinematographer.co.uk/emmanuel-lubezki-amc-asc-the-tree-of-life/). |
| Meirelles + Charlone / *Cidade de Deus*, codireção Kátia Lund | Charlone relata predominância 16mm combinada a 35mm, câmera na mão para respeitar os atores, referências de fotografia de época e cor de Miguel Rio Branco. Os relatos diferem no percentual; o catálogo não fixa um. | Diagonais e planos próximos sobrepostos, foco de trabalho documental, contraste incisivo e grão pequeno-formato mais presente que no perfil grande-formato. Ocres/terrosos são um recorte interpretativo, não descrição de todos os períodos do filme. Não acrescentar pobreza, violência, sujeira ou riscos. [Entrevista ABC](https://abcine.org.br/entrevistas/entrevista-com-cesar-charlone-abc/), [Sessão ABC 2002](https://abcine.org.br/eventos/sessao-abc-2002/). |

## Contrato técnico

- IDs e seis slots preservados: framing, optics, dof, light, color, texture.
- Novo `artDirection` por perfil e `ART_DIRECTION_SCOPE` exportado; o compilador só aplica arte quando não há referência de ambiente/composição ou layout explicitamente controlado.
- O teto antigo de 139 caracteres era uma convenção de teste, não limite do produto. Foi substituído por até 320 caracteres úteis por slot, mantendo o perfil completo abaixo de 2.400 caracteres; sem listas de câmera, jargão técnico gratuito ou cortes silenciosos.
- Cada perfil mantém 6 decisões distintas; filme limpo digital, grão fino grande-formato, grão fino 35mm e grão pequeno-formato mais visível não são intercambiáveis.

### Refino posterior das decisões visuais

As seis capturas fornecidas por Daniel foram usadas como referência de relações visuais, não como base copiada ou estudo de todo o ShotDeck. O refino evita uma receita única de “grão + bokeh + halo”: preserva profundidade nos planos abertos, condiciona efeitos à iluminação existente e diferencia hierarquia, intervalos, preenchimento, paleta e acabamento. Descrições de proximidade são condicionais ao plano; um pedido explícito de plano geral não deve receber enquadramento íntimo por baixo.

O formato da instrução segue a recomendação do fabricante de descrever composição, iluminação e tratamento concretos, com funções claras para referências. Não é uma promessa de aderência perfeita nem prova de que o modelo interpreta cada atributo isoladamente. Fontes: [guia Gemini Image](https://deepmind.google/models/gemini-image/prompt-guide/) e [orientações Nano Banana Pro](https://blog.google/products-and-platforms/products/gemini/prompting-tips-nano-banana-pro/).

## Validação

`node test-fotograma-auteur.mjs` verifica catálogo, imutabilidade, limites, autoridade da direção de arte e características contrastantes dos seis perfis. `--browser` verifica o compilador real e que cada slot selecionado aparece uma vez, com nota visível e sem equipamento histórico no prompt. Todas as requisições externas são rejeitadas; não há geração nem consumo de créditos.

Resultados desta revisão: **34/34** verificações autorais com `--browser`; **28/28** contratos de ferramentas com `--browser`, incluindo preservação de briefing de 12.000 caracteres. Nenhum erro de página ou pedido a provedor/conta no teste autoral.

Esses testes validam os **contratos enviados**, não garantem a força visual de uma imagem gerada. Uma comparação A/B futura deve usar o mesmo briefing, referências, resolução e modelo nos seis perfis, avaliar composição/foco/luz/cor/textura separadamente e respeitar a autorização de quantidade/formato antes de gerar.
