---
name: cybersecurity
description: "Squad de 15 agentes de cibersegurança. Pentest, red team, blue team, AppSec, incident response, recon, exploitation — tudo com framework ético. Coordena operações ofensivas e defensivas dentro de limites autorizados."
---

# cybersecurity

Squad de 15 agentes de cibersegurança. Pentest, red team, blue team, AppSec, incident response, recon, exploitation — tudo com framework ético. Coordena operações ofensivas e defensivas dentro de limites autorizados.

## When to Apply

### Must Use
- Security review de código
- Pentest e vulnerability assessment
- Incident response
- AppSec e secure coding
- Red team / blue team exercises
- Compliance e security policies

### Skip
- Desenvolvimento de features
- Design ou branding
- Marketing ou vendas

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
