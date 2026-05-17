# @nebutra/llm-gateway

Status: WIP — local experiment, not the production AI gateway.

`@nebutra/llm-gateway` is a capability-routing prototype over
`@nebutra/provider-registry`. It is useful for local experiments around
fallback, prefix cache, and usage-ledger shape, but it is not wired to
production API-key authentication, tenant metering, vault-backed key pools, or
durable budget enforcement.

Use these production surfaces instead:

- App/runtime model execution: `@nebutra/agents`
- External API-key gateway traffic: `backends/gateway` + `@nebutra/gateway-core`
- Provider metadata and scaffolding: `@nebutra/ai-providers`

Do not add new production consumers of this package without first promoting the
missing gateway, vault, tenant, and usage-ledger integrations and changing its
`nebutra.status` metadata.
