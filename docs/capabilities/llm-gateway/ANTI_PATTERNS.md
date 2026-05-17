# llm-gateway anti-patterns

## Reimplementing providers

Do not call provider APIs directly from this package. Use `provider-registry`.

## Whole-conversation cache

Do not persist entire conversations as a cache primitive. The Layer 0 cache is prefix-oriented.

## Token counting as truth

Do not invent authoritative token counts here. Provider usage, when returned, is the source of truth.

## Prompt templates

Do not add free-form prompt templates. Higher orchestration owns prompt construction.
