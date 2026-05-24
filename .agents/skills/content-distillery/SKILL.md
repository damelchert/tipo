---
name: content-distillery
description: "Transforma livestreams longas do YouTube em frameworks estruturados, heurísticas, modelos mentais e conteúdo multi-plataforma. 9 agentes baseados em elite minds: Cedric Chin, Shane Parrish, Tiago Forte, Gary Vee, Nicolas Cole, Dan Koe, Justin Welsh, Paddy Galloway."
---

# content-distillery

Transforma livestreams longas do YouTube em frameworks estruturados, heurísticas, modelos mentais e conteúdo multi-plataforma. 9 agentes baseados em elite minds: Cedric Chin, Shane Parrish, Tiago Forte, Gary Vee, Nicolas Cole, Dan Koe, Justin Welsh, Paddy Galloway.

## When to Apply

### Must Use
- Extrair frameworks de vídeos longos
- Transformar conteúdo longo em formatos curtos
- Criar modelos mentais a partir de palestras
- Repurposing de conteúdo multi-plataforma
- Análise de conteúdo YouTube

### Skip
- Criação de conteúdo do zero
- Design visual
- Desenvolvimento de software

## Squad Structure

This skill loads the full squad from `squad/` directory. Key resources:
- `squad/config/config.yaml` — squad configuration, agents, tiers, handoffs
- `squad/agents/` — individual agent definitions
- `squad/tasks/` — available task templates
- `squad/workflows/` — orchestration workflows
- `squad/checklists/` — quality checklists
- `squad/data/` — knowledge bases and routing catalogs

## How to Use

1. Read `squad/config/config.yaml` to understand available agents and routing
2. Identify the entry agent (orchestrator) for triage
3. Load the relevant agent definition from `squad/agents/`
4. Follow the agent's persona, frameworks, and output format
5. Use checklists from `squad/checklists/` for quality validation
