---
name: design
description: "Complete design squad with 10 expert agents covering brand strategy, DesignOps, design business, logo design, thumbnails/YouTube, photography, design systems, and dark premium theme transformation. Includes Marty Neumeier, Chris Do, Brad Frost, Aaron Draplin, Paddy Galloway."
---

# design

Complete design squad with 10 expert agents covering brand strategy, DesignOps, design business, logo design, thumbnails/YouTube, photography, design systems, and dark premium theme transformation. Includes Marty Neumeier, Chris Do, Brad Frost, Aaron Draplin, Paddy Galloway.

## When to Apply

### Must Use
- Design de logos e identidade visual
- Thumbnails e assets para YouTube
- Design systems e component libraries
- DesignOps e processos de design
- Photography direction
- Dark premium theme design
- Brand strategy visual

### Skip
- Backend development
- DevOps e infraestrutura
- Copywriting puro

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
