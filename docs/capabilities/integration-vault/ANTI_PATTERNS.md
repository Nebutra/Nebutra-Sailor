# integration-vault Anti-Patterns

## Token Leakage

Do not return OAuth access tokens from public APIs, debug commands, traces, or examples. Return token ids, scopes, provider ids, and health metadata.

## Tenant Bypass

Do not allow connect, list, consent, or invoke without a tenant id. A missing tenant is a contract failure, not a default organization.

## Consent Collapse

Do not treat app-level connection as consent for every action. Store per-action grants so high-risk actions can remain blocked even when the app is connected.

## Provider Lock-In

Do not let product code import a specific integration provider SDK. Product code calls `IntegrationVault`; provider SDKs stay behind adapters.

## Prompt Secrets

Do not pass tokens, refresh tokens, or full credentials into prompts. Agents may see token ids and scopes only.
