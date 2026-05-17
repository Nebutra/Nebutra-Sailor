# code-execution Anti-Patterns

- Do not let agent-runtime spawn shell commands.
- Do not use overwrite semantics for edits.
- Do not silently swallow stderr, timeout, or policy failures.
- Do not share notebook kernels across threads.
- Do not execute destructive commands without explicit approval.
