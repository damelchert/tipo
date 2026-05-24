---
name: Codex-mastery
description: "Squad especialista em todas as dimensões do Codex: hooks, skills, subagents, MCP, plugins, agent teams, customização, integração com projetos, roadmap tracking, e AIOS-core architecture. 8 agentes cobrindo full-spectrum Codex expertise."
---

# Codex-mastery

Squad especialista em todas as dimensões do Codex: hooks, skills, subagents, MCP, plugins, agent teams, customização, integração com projetos, roadmap tracking, e AIOS-core architecture. 8 agentes cobrindo full-spectrum Codex expertise.

## When to Apply

### Must Use
- Configuração avançada de Codex
- Criação de hooks, skills e subagents
- Integração com MCP servers
- Plugins e marketplace
- Agent teams e orquestração
- Debugging de configurações Codex

### Skip
- Desenvolvimento de software genérico
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
