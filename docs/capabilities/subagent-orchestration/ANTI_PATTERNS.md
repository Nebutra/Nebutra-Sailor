# subagent-orchestration Anti-Patterns

- Do not fan out briefs with dependencies.
- Do not let a child mutate parent state directly.
- Do not dispatch a subagent without a concrete objective, tool scope, boundary, and budget.
- Do not put tool implementation in orchestration.
