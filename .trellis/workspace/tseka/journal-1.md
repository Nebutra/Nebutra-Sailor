# Journal - tseka (Part 1)

> AI development session journal
> Started: 2026-09-08

---


## 2026-09-08 — router-unified-supply
- Decision: CLIProxyAPI hangs under New-API as an OpenAI-type channel, never a second Router upstream; Router keeps one upstream and inherits scheduling/failover.
- Decision: Router keys = shared `APIKey` table (user ecosystem first); edge validates by hash so both `sk-sailor-` and `nbk_live_` work. New `ApiKeyRepository` in @nebutra/repositories.
- Gotcha: Anthropic clients send `x-api-key` + `anthropic-version`; the old edge only forwarded Authorization/Content-Type and 401'd them.
- Gotcha: `APIKey.tenantId` is `Tenant.id`, not organizationId/userId — resolve via `tenant.organizationId` / `tenant.userId` uniques.
- Gotcha: `@nebutra/db` build needs `@nebutra/tenant` dist first; router tests need router-supply/brand/prepaid-wallet/db built.
- CLIProxyAPI v7.2.154 flags: `-codex-device-login` (headless), `-antigravity-login -no-browser` (Google, callback :51121), `-claude-login`; no plain `-login`.
- 2026-09-08 later: New-API on Fly had 0 users (setup wizard never run; ECS data copy did not carry users). Use /api/setup over `flyctl proxy` (needs ~15 s to come up), not sqlite hacks. calciumion/new-api image has wget; eceasy/cli-proxy-api has neither wget nor curl — smoke over flyctl proxy from the runner.
- 2026-09-08 admin contract shipped (#549). CI gotchas: `pnpm test:arch` prints ❌ brand-literal lines from a self-test (not failures); doc-claims-drift test checks AGENTS.md "no local tests" claims; landing `capability-folder-data` counts source/test files per package → run `pnpm gen:capability-stats` after adding files to packages/commerce; gateway-core tests can time out on slow runners (rerun). Merge after squash-merged PR needs manual conflict resolution; lefthook rejects default merge message (use conventional `chore(merge): …`).
