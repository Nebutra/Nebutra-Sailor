# Nebutra Package Status

This page tracks the production-readiness of each `@nebutra/*` package
exposed by `create-sailor`. It is the human-readable companion to the
machine-readable `nebutra` block in every `package.json`.

## Status values

| Status          | Meaning                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `stable`        | Production-ready. Full implementation. Default assumption for packages not listed below.         |
| `foundation`    | Types + factory + auto-detection are complete. Provider adapters are stub-level and need creds.  |
| `wip`           | Actively under development. Do not use in production until the notice is removed from its README.|
| `deprecated`    | Scheduled for removal. Do not use.                                                               |

## How to read the CLI

When you run `create-sailor` and select a provider whose underlying
package is not `stable`, the CLI will:

1. Print a yellow `⚠` warning after the dry-run plan and again right
   before the done card.
2. In `--json` mode, emit an `event: "warn"` with `packageStatus`,
   `provider`, and `step`.
3. Add the selection to a `⚠  Preview features selected` section of the
   post-install "done card".

You are never blocked from selecting a preview provider — the guarantee
is transparency, not restriction.

## Foundation packages (9)

These packages ship a real factory, type definitions, and provider
registration. Their provider adapters are scaffolded but stub-level:
they compile, import, and auto-detect, but calling the happy path
usually needs: (a) external credentials, (b) additional adapter code
you contribute, or (c) a managed SaaS that the provider wraps.

| Package                  | CLI flag(s)            | Ready out-of-the-box?                 | Main gaps                                                           |
| ------------------------ | ---------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `@nebutra/metering`      | (enabled via payment)  | No — needs ClickHouse or local dev    | ClickHouse adapter is stub; rollups & billing sync pending          |
| `@nebutra/notifications` | `--notifications`      | No — Novu/Knock creds required        | Adapter batching/retry limited; in-app feed + prefs not implemented |
| `@nebutra/permissions`   | (consumed directly)    | Partial — CASL works in-process       | OpenFGA adapter stub; field-level perms pending                     |
| `@nebutra/queue`         | `--queue`              | No — QStash or Redis credentials      | Dead letter queue TODO; worker auto-scaling TODO                    |
| `@nebutra/search`        | `--search`             | No — provider creds required          | Provider adapters are stubs; pgvector not implemented               |
| `@nebutra/tenant`        | (enabled by middleware)| Partial — AsyncLocalStorage works     | RLS SQL generation pending; subdomain/JWT resolvers scaffolded      |
| `@nebutra/uploads`       | (consumed directly)    | No — S3/R2 creds required             | Tus flow not end-to-end; validation stubs                           |
| `@nebutra/vault`         | (consumed directly)    | Partial — local HKDF works for dev    | KMS rotation flow TODO; tenant isolation scaffolded                 |
| `@nebutra/webhooks`      | `--webhooks`           | No — Svix token or signing secret     | Retry/DLQ in custom adapter incomplete                              |

## WIP packages (8)

These packages have code skeletons, README intent, and types, but no
production integrations. Their READMEs carry a `Status: WIP — Not yet
integrated into any production app` banner. Expect breaking changes
and missing functionality.

| Package                  | CLI flag(s)             | Why WIP                                                          |
| ------------------------ | ----------------------- | ---------------------------------------------------------------- |
| `@nebutra/audit`         | (consumed directly)     | Event schema not finalized; query API not implemented            |
| `@nebutra/feature-flags` | `--feature-flags`       | Provider adapters not wired; gradual rollout logic pending       |
| `@nebutra/ai-providers`  | `--ai`                  | Provider implementations not exercised; retry/fallback pending   |
| `@nebutra/captcha`       | `--captcha`             | hCaptcha & Aliyun adapters scaffolded only                       |
| `@nebutra/event-bus`     | (consumed by saga)      | Cross-service pub/sub guarantees not verified                    |
| `@nebutra/legal`         | (consumed directly)     | Consent persistence + document versioning pending                |
| `@nebutra/mcp`           | `--mcp`                 | Context server binary is a placeholder stub                      |
| `@nebutra/saga`          | (consumed directly)     | No durable journal; compensation logic scaffolded only           |

## Contributing

If you want to take one of these packages to `stable`:

1. Open an issue describing which provider adapter you want to flesh out.
2. Read the inline TODOs in `packages/<name>/src/providers/*`.
3. Add end-to-end tests — a `stable` package must have at least one
   real-world integration covered.
4. Once the adapter is complete, update:
   - `packages/<name>/package.json` → set `nebutra.status = "stable"` and
     drop the `gaps` array (or leave it empty).
   - `packages/<name>/README.md` → remove the `Status:` banner.
   - `packages/create-sailor/src/utils/package-status.ts` → remove the
     entry (defaults to `stable`).
   - This doc.

## Machine-readable source of truth

Every package carries its status in its own `package.json`:

```json
{
  "name": "@nebutra/queue",
  "nebutra": {
    "status": "foundation",
    "productionReady": false,
    "requires": ["QSTASH_TOKEN or REDIS_URL"],
    "gaps": [
      "Dead letter queue not implemented",
      "Worker auto-scaling TODO"
    ]
  }
}
```

Tooling should prefer reading these blocks over scraping this document.
