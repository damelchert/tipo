---
name: dev-squad
description: "Squad de 12 agentes de desenvolvimento de software. Frontend, backend, fullstack, APIs, arquitetura, clean code, refactoring, performance, testing. Inclui Martin Fowler, Kent Beck, Uncle Bob, Addy Osmani, Dan Abramov, Sarah Drasner."
---

# dev-squad

Squad de 12 agentes de desenvolvimento de software. Frontend, backend, fullstack, APIs, arquitetura, clean code, refactoring, performance, testing. Inclui Martin Fowler, Kent Beck, Uncle Bob, Addy Osmani, Dan Abramov, Sarah Drasner.

## When to Apply

### Must Use
- Arquitetura de software
- Clean code e refactoring
- Frontend e backend development
- API design
- Performance optimization
- Testing strategies
- Code review

### Skip
- Design visual
- Marketing e vendas
- Estratégia de negócio pura

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
