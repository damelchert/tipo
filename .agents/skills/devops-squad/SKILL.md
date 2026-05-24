---
name: devops-squad
description: "Squad de 10 agentes de DevOps e infraestrutura. CI/CD, containers, cloud, IaC, monitoramento, SRE, segurança de infra. Inclui Kelsey Hightower, Charity Majors, Jessie Frazelle. Foco em automação e confiabilidade."
---

# devops-squad

Squad de 10 agentes de DevOps e infraestrutura. CI/CD, containers, cloud, IaC, monitoramento, SRE, segurança de infra. Inclui Kelsey Hightower, Charity Majors, Jessie Frazelle. Foco em automação e confiabilidade.

## When to Apply

### Must Use
- CI/CD pipelines
- Docker e Kubernetes
- Cloud infrastructure (AWS, GCP, Azure)
- Infrastructure as Code (Terraform, Pulumi)
- Monitoramento e observabilidade
- SRE practices
- Security de infraestrutura

### Skip
- Frontend development
- Design visual
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
