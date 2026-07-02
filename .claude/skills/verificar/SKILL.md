---
name: verificar
description: "Verificacao automatica das ferramentas do Tipo. Roda testes Playwright existentes, checa se cada tool carrega, grava MP4, exporta PNG e reporta o que quebrou."
---

# /verificar — Verificacao do Tipo

Roda os testes Playwright que ja existem no projeto para verificar se as ferramentas estao funcionando. Reporta o que passou e o que quebrou de forma objetiva.

## Quando Usar

- Depois de buildar ou arrumar qualquer ferramenta
- Depois de mexer em shared/recorder.js, shared/ui.js ou shared/style.css
- Antes de fazer deploy (git push)
- Quando o Daniel pedir `/verificar`

## Como Funciona

### Modo 1: Verificacao rapida (padrao)

Testa APENAS as ferramentas que foram modificadas na sessao atual. Se nenhuma foi modificada, pergunta ao Daniel o que verificar.

Para descobrir o que foi modificado:
```bash
cd /Users/danielmelchert/PROJETOS/tipo
git diff --name-only HEAD 2>/dev/null | grep '\.html$\|shared/' | head -20
```

### Modo 2: Verificacao completa (`/verificar tudo`)

Testa TODAS as 34 ferramentas. Demora mais mas garante que nada quebrou.

### Modo 3: Ferramenta especifica (`/verificar dithering` ou `/verificar riso,datamosh`)

Testa apenas as ferramentas listadas.

## Passo a Passo da Execucao

### 1. Identificar o que testar

Baseado no modo, montar a lista de ferramentas a verificar.

### 2. Rodar os testes existentes

O projeto ja tem testes Playwright prontos. Usar os que existem:

| Teste | O que cobre |
|-------|------------|
| `test-recording-kinetic.mjs <tool>.html` | Gravacao MP4 + PNG + PNG alpha de UMA ferramenta (kinetic/TipoUI) |
| `test-rec-sweep.mjs` | FPS + stutters + MP4 de TODAS as ferramentas (sweep completo) |
| `test-riso.mjs` | Riso especifico (presets, CMYK, separacoes, MP4) |
| `test-datamosh.mjs` | Datamosh especifico (temporal, keyframes, channel, MP4) |
| `test-depth.mjs` | Depth especifico (depth map, parallax, presets, MP4) |
| `test-gradientmap.mjs` | Gradient Map (LUT, stops, tone, cycle, MP4) |
| `test-pixelsort.mjs` | Pixel Sort (monotonicidade, angulos, drift, MP4) |
| `test-dither-engine.mjs` | Dithering engine (13 algoritmos, adjustments, tint, glow, MP4) |
| `test-glitch-adv.mjs` | Glitch avancado (5 efeitos novos, presets, MP4) |
| `test-glow.mjs` | Epsilon Glow (threshold, epsilon, anamorphic, MP4) |
| `test-rastro.mjs` | Rastro (echo, transform, motion matte, MP4) |
| `test-behaviors.mjs` | TipoBehavior (injecao, 5 tipos, clamp, morph) |
| `test-stagger.mjs` | TipoStagger (math + render nos 3 tools) |
| `test-help.mjs` | Help tooltips |

**Regras de execucao:**
- Rodar de dentro do diretorio do projeto: `cd /Users/danielmelchert/PROJETOS/tipo`
- Ferramentas kinetic (com TipoUI): usar `node test-recording-kinetic.mjs <tool>.html`
- Visual tools com teste dedicado: usar o teste especifico (ex: `node test-riso.mjs`)
- Se shared/recorder.js ou shared/ui.js mudou: rodar `node test-rec-sweep.mjs` (testa tudo)

### 3. Smoke test basico para ferramentas SEM teste dedicado

Se a ferramenta modificada nao tem teste dedicado, rodar um smoke test inline via Playwright:

```javascript
// Checklist minimo:
// 1. Pagina carrega sem pageerror
// 2. Canvas existe e tem dimensoes > 0
// 3. Botao Record existe
// 4. Nenhum erro no console (exceto warnings conhecidos)
```

Executar isso via Bash com node inline — NAO criar arquivo novo.

### 4. Reportar resultados

Formato do report:

```
## Verificacao Tipo

### Testadas: X ferramentas
### Resultado: Y/X passaram

| Ferramenta | Carrega | Gravacao | PNG | PNG Alpha | Notas |
|------------|---------|----------|-----|-----------|-------|
| dithering  | OK      | OK       | OK  | OK        |       |
| riso       | OK      | FALHOU   | OK  | OK        | MP4 0 bytes |
| datamosh   | OK      | OK       | OK  | n/a       |       |

### Problemas encontrados:
- **riso.html**: Gravacao MP4 gerou arquivo de 0 bytes. Possivel causa: [...]

### O que nao foi testado:
- Mobile (nao tem teste automatizado)
- Safari (testes rodam em Chromium)
```

## Regras

1. **NAO criar testes novos** — usar os que ja existem no projeto
2. **NAO modificar codigo** — so testar e reportar
3. **NAO rodar todos os testes se so uma ferramenta mudou** — ser proporcional
4. **Se shared/ mudou, ai sim rodar sweep completo** — mudanca em shared afeta tudo
5. **Reportar com honestidade** — se algo falhou, dizer o que falhou. Se nao sabe a causa, dizer que nao sabe
6. **Tempo esperado**: ~1-2 min por ferramenta individual, ~5-8 min para sweep completo
