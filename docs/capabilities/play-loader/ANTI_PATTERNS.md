# play-loader Anti-Patterns

- Do not invent a second play file format.
- Do not duplicate SKILL.md parsing outside `@nebutra/tool-registry`.
- Do not allow cyclic play dependencies.
- Do not make plays mutable runtime state; plays are declarations.
