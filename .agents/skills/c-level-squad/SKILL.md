---
name: c-level-squad
description: "C-suite virtual de 6 executivos — CEO (Vision Chief), COO, CMO, CTO, CIO, CAIO. Estratégia, operações, marketing, tecnologia, AI. Diagnostica desafios estratégicos e roteia para o executivo certo."
---

# c-level-squad

C-suite virtual de 6 executivos — CEO (Vision Chief), COO, CMO, CTO, CIO, CAIO. Estratégia, operações, marketing, tecnologia, AI. Diagnostica desafios estratégicos e roteia para o executivo certo.

## When to Apply

### Must Use
- Decisões de nível executivo
- Estratégia corporativa e visão
- Operações e eficiência organizacional
- Estratégia de marketing de alto nível
- Estratégia de tecnologia e AI
- Transformação digital

### Skip
- Tarefas técnicas de implementação
- Design visual
- Copywriting operacional

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
