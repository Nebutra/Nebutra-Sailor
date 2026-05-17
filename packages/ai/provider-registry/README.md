# @nebutra/provider-registry

Status: WIP — local provider experiment, not the canonical runtime registry.

`@nebutra/provider-registry` defines a lightweight local provider trait and a
zero-config local default. It is intentionally not the production provider
registry for Nebutra AI SaaS workloads.

Use these production surfaces instead:

- Runtime model execution and provider SDK wiring: `@nebutra/agents`
- Provider metadata, status flags, and templates: `@nebutra/ai-providers`
- External API-key gateway routing and tenant accounting: `backends/gateway`

New production packages should not depend on `@nebutra/provider-registry`.
Keep it contained to local experiments and migration examples unless the
package is deliberately promoted with tenant-aware key-pool, health, budget,
and audit persistence.
