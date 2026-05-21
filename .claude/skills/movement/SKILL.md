---
name: movement
description: "Squad de 7 agentes para construção de movimentos. Fenomenologia, identidade, manifestos, ciclos de crescimento, medição de impacto. Cobre todo o ciclo de vida: spark, identity, ignition, growth, impact."
---

# movement

Squad de 7 agentes para construção de movimentos. Fenomenologia, identidade, manifestos, ciclos de crescimento, medição de impacto. Cobre todo o ciclo de vida: spark, identity, ignition, growth, impact.

## When to Apply

### Must Use
- Criação de movimentos e comunidades
- Manifestos e narrativas de causa
- Identidade de movimento
- Ciclos de crescimento orgânico
- Medição de impacto social

### Skip
- Desenvolvimento técnico
- Design de interfaces
- Vendas diretas

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
