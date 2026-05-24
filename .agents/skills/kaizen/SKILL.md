---
name: kaizen
description: "Meta-squad de RH + Ferramentas. Analisa continuamente o ecossistema de agentes, squads, ferramentas e competências. Detecta gaps, monitora performance, recomenda novos recursos. O sistema nervoso do AIOS. 7 agentes com frameworks Team Topologies, DORA, Theory of Constraints, Wardley Maps, Technology Radar, FinOps."
---

# kaizen

Meta-squad de RH + Ferramentas. Analisa continuamente o ecossistema de agentes, squads, ferramentas e competências. Detecta gaps, monitora performance, recomenda novos recursos. O sistema nervoso do AIOS. 7 agentes com frameworks Team Topologies, DORA, Theory of Constraints, Wardley Maps, Technology Radar, FinOps.

## When to Apply

### Must Use
- Análise do ecossistema de squads e agentes
- Detecção de gaps de competência
- Performance monitoring de agentes
- Recomendação de novos recursos
- Governança e evolução do AIOS
- Team Topologies e org design

### Skip
- Execução técnica direta
- Design visual
- Vendas e marketing operacional

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
