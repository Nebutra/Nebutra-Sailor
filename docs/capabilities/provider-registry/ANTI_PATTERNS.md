# provider-registry anti-patterns

## Routing at the provider layer

Do not choose between multiple providers here. Register providers only; route in `llm-gateway`.

## Cache in the provider layer

Do not cache prompts or responses in this package. Provider behavior should reflect the underlying provider result.

## Naked errors

Every provider failure must throw `CapabilityError` or return a health report with `suggestion`.

## Provider-specific prompts

Do not add prompt templates here. Prompt generation belongs to an orchestration layer.
