---
name: design-squad
description: "Squad de design operations — 3 experts (Brad Frost, Dan Mall, Dave Malouf) + 4 especialistas + 1 orquestrador. Design systems, UX, UI, visual. Cobre desde criação de design systems até handoff de implementação."
---

# design-squad

Squad de design operations — 3 experts (Brad Frost, Dan Mall, Dave Malouf) + 4 especialistas + 1 orquestrador. Design systems, UX, UI, visual. Cobre desde criação de design systems até handoff de implementação.

## When to Apply

### Must Use
- Design systems e tokens
- UX research e wireframes
- UI design e prototyping
- Design handoff e specs
- DesignOps e processos
- Component libraries

### Skip
- Backend puro
- DevOps
- Marketing e vendas

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
