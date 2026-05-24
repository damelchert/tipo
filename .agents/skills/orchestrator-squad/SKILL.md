---
name: orchestrator-squad
description: "Squad de 8 agentes de orquestração cross-squad. Coordenação entre squads, handoffs inter-squad, pipeline management, quality gates, e governança de workflows multi-squad. O maestro que orquestra os orquestradores."
---

# orchestrator-squad

Squad de 8 agentes de orquestração cross-squad. Coordenação entre squads, handoffs inter-squad, pipeline management, quality gates, e governança de workflows multi-squad. O maestro que orquestra os orquestradores.

## When to Apply

### Must Use
- Coordenação entre múltiplos squads
- Handoffs inter-squad
- Pipeline management cross-domain
- Quality gates e governança
- Workflows multi-squad complexos

### Skip
- Tarefas de um único domínio
- Execução técnica simples
- Design ou copy isolados

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
