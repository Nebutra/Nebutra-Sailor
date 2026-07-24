# API Protocols — REST / tRPC / oRPC 治理

The gateway can speak three API protocols over the same domain layer:
**REST/OpenAPI** (always on), **tRPC** (opt-in), and **oRPC** (opt-in). This
document is the governance contract for which protocol to reach for, how to turn
each on, and the invariants that keep all three behaviourally identical.

The vocabulary here is intentionally the same as the preset system's
`@nebutra/preset` → `ApiProtocolId = "rest" | "orpc" | "trpc"`, so a
`defineConfig({ apiProtocols: ["rest", "trpc"] })` choice and the deployed gateway
speak the same language.

---

## 何时用哪个 (Decision table)

| Protocol | 何时用 (When) | 谁是消费者 (Consumers) | 类型/契约来源 |
| --- | --- | --- | --- |
| **REST / OpenAPI** | **主路径 (default)**: 对外 API、第三方集成、公开 SDK。**始终开启**，是规范公开契约。 | External clients, partners, public SDKs, anything that needs a stable HTTP contract. | `openapi.json` is auto-generated from `createRoute` definitions; clients generate types with `openapi-fetch` / `openapi-typescript`. |
| **tRPC** | 内部、**TS-only** 端到端类型安全。我们自己的 first-party TS apps（dashboard 等），无需手写或生成客户端类型。 | First-party TypeScript apps in this monorepo. Best DX with `@trpc/react-query`. | Types flow directly from the server router (`TrpcRouter`) — no codegen, no schema file. |
| **oRPC** | 内部、**契约优先 (contract-first)** 的 RPC，同时**OpenAPI 兼容**。当你想要 RPC 的 DX 但仍要导出一个 OpenAPI 契约时。 | First-party services that want RPC ergonomics plus an OpenAPI-compatible surface. | Procedure handlers are the contract; oRPC can emit OpenAPI, bridging RPC and REST worlds. |

**Rule of thumb**

- 对外 / 第三方 / 公开 SDK → **REST**.
- 内部、TS-only、要 `@trpc/react-query` 的 DX → **tRPC**.
- 内部、契约优先、还想要 OpenAPI 兼容的 RPC → **oRPC**.

REST is never "instead of" tRPC/oRPC — it is the always-on canonical contract.
tRPC and oRPC are additive, internal conveniences layered on the same domain
procedures.

---

## 启用方式 (Enablement)

Protocol enablement is resolved by
[`src/config/protocols.ts`](src/config/protocols.ts) →
`resolveEnabledProtocols(envSource)`, which returns a
`Set<"rest" | "trpc" | "orpc">`. **REST is always in the set.**

**Production default: REST only.** tRPC / oRPC are optional internal adapters.

Resolution precedence (first that applies wins):

1. **`API_PROTOCOLS`** — canonical comma list, e.g. `"rest,trpc,orpc"`.
   - Values are trimmed, lowercased, and validated against the `rest|trpc|orpc`
     vocabulary (same word-list as `@nebutra/preset`'s `apiProtocols`).
   - Unknown tokens are ignored (`"rest,foo"` → just `rest`).
   - **When `API_PROTOCOLS` is set, legacy booleans are NOT consulted.**
     `API_PROTOCOLS="rest"` + `ENABLE_TRPC="true"` → tRPC stays **off**.
2. **`NEBUTRA_API_PROTOCOLS`** — alias written by `@nebutra/preset` scaffolds
   (same format as #1). Used only when `API_PROTOCOLS` is absent.
3. **Legacy `ENABLE_TRPC` / `ENABLE_ORPC`** (`"true"`) — **deprecated**, remove
   by **2026-10-01**. Used only when neither list env is set.
4. **Default** — REST only.

```bash
# Canonical (preferred)
API_PROTOCOLS="rest"             # production default (explicit)
API_PROTOCOLS="rest,trpc"        # REST + tRPC for first-party TS apps
API_PROTOCOLS="rest,trpc,orpc"   # all three

# Preset alias (same semantics)
NEBUTRA_API_PROTOCOLS="rest,trpc"

# Legacy (deprecated — do not use in new deploys; sunset 2026-10-01)
ENABLE_TRPC="true"
ENABLE_ORPC="true"
```


### Mount points

[`src/index.ts`](src/index.ts) reads the resolved flags
(`isTrpcEnabled` / `isOrpcEnabled` from `config/protocols.ts`) and mounts the
optional adapters via dynamic import so disabled protocols cost nothing:

| Protocol | Path | Adapter |
| --- | --- | --- |
| REST | `/...` (always on) + `/openapi.json` + `/docs` | the root `OpenAPIHono` app |
| tRPC | `/api/trpc` | [`src/trpc/adapter.ts`](src/trpc/adapter.ts) (`fetchRequestHandler`, endpoint `/api/trpc`) |
| oRPC | `/api/rpc` | [`src/orpc/adapter.ts`](src/orpc/adapter.ts) (`RPCHandler`, prefix `/api/rpc`) |

Both RPC adapters run `tenantContextMiddleware` first and pass
`{ tenant: c.get("tenant") }` into the procedure context — so RPC requests are
authenticated through the exact same path as REST.

---

## 平价契约 (Parity contract)

All three protocols currently expose the **same** procedure surface, and any new
procedure MUST be added to all three to keep parity:

| Procedure | Auth | Returns |
| --- | --- | --- |
| `health.check` | public | `{ status: "ok", timestamp }` |
| `billing.getUsage` | **protected** (requires `tenant.userId`) | usage snapshot for the given `orgId` |
| `billing.getPlans` | public | the plan catalogue (`FREE` / `PRO` / `ENTERPRISE`) |

Routers:

- tRPC — [`src/trpc/router.ts`](src/trpc/router.ts) (`trpcRouter`)
- oRPC — [`src/orpc/router.ts`](src/orpc/router.ts) (`orpcRouter`)
- REST — the corresponding routes under `src/routes/**`

**Same-source rule.** A new procedure must be wired with the **same source** as
REST, namely:

- **Same context** — `tenantContextMiddleware` resolves the tenant; both RPC
  adapters pass `{ tenant }` into the procedure context. Use `protectedProcedure`
  for anything that requires an authenticated user, exactly as REST routes use
  `requireAuth`.
- **Same data source** — e.g. `billing.getUsage` calls the shared
  `getUsageSnapshot` from [`src/middlewares/usageMetering.ts`](src/middlewares/usageMetering.ts),
  the same helper the REST billing route uses. Do not fork the data layer per
  protocol.
- **Same errors** — throw `@nebutra/errors` domain errors (`UnauthorizedError`,
  `NotFoundError`, `ValidationError`, …); the funnel below maps them
  consistently across all three protocols.

---

## 错误处理 (Error handling)

All three protocols converge on the **single `@nebutra/errors` funnel** so a
domain `AppError` produces a consistent `code` + HTTP `status` + envelope
everywhere. The shared mapping lives in
[`src/lib/rpc-errors.ts`](src/lib/rpc-errors.ts) (`toRpcError`), which wraps
`@nebutra/errors`' `getStatusCode` + `toApiError` and collapses the status onto a
shared RPC code vocabulary (`BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND |
CONFLICT | TOO_MANY_REQUESTS | INTERNAL_SERVER_ERROR`). The canonical envelope is:

```jsonc
{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }
```

| Protocol | Where the funnel runs | What the client sees |
| --- | --- | --- |
| **REST** | [`src/index.ts`](src/index.ts) `app.onError` → `toApiError(err)` + `getStatusCode(err)` | HTTP status + the canonical `{ error: { code, message } }` body. |
| **tRPC** | [`src/trpc/init.ts`](src/trpc/init.ts): an `errorMappingMiddleware` re-throws domain `AppError`s as `TRPCError` with the mapped `code`, AND the `errorFormatter` attaches `toRpcError(error.cause ?? error).api` to **every** error. | `TRPCError` + `error.data.api` carrying the canonical envelope (e.g. `code: "UNAUTHORIZED"`, `status: 401`). |
| **oRPC** | [`src/orpc/init.ts`](src/orpc/init.ts): a `guarded` middleware maps domain `AppError`s through `toRpcError` into an `ORPCError` with the matching `code`, exact `status`, and the canonical envelope as `data`. | `ORPCError` with `code` + `status` + `data` = the canonical envelope directly. |

**Domain `AppError` → consistent code/status/envelope.** For example, a
`protectedProcedure` hit without `tenant.userId` throws `UnauthorizedError`, which
becomes a `401` / `UNAUTHORIZED` with an identical envelope on REST, tRPC, and
oRPC.

**Adapter nuance (documented, on purpose):**

- **oRPC** surfaces the canonical `code` (`"UNAUTHORIZED"`) and `status` (`401`)
  **directly** on the thrown `ORPCError`.
- **tRPC** wraps a raw thrown domain error at the procedure boundary, so the
  outer `TRPCError.code` may be the generic `INTERNAL_SERVER_ERROR`; the
  **canonical** code/envelope is carried via `error.cause` →
  `errorFormatter`'s `data.api` (i.e. `toRpcError(error.cause ?? error)`). That is
  the body clients actually consume, and it matches REST/oRPC.

**Non-`AppError` values** propagate unchanged and collapse to a safe
`INTERNAL_SERVER_ERROR` / `500` with no detail leak — identical across all three.

---

## Related files

| File | Role |
| --- | --- |
| [`src/config/protocols.ts`](src/config/protocols.ts) | `resolveEnabledProtocols(envSource)`, `enabledProtocols`, `isTrpcEnabled`, `isOrpcEnabled`. |
| [`src/index.ts`](src/index.ts) | App assembly: mounts tRPC at `/api/trpc`, oRPC at `/api/rpc`; REST `app.onError`; `/openapi.json` + `/docs`. |
| [`src/lib/rpc-errors.ts`](src/lib/rpc-errors.ts) | Shared `@nebutra/errors` funnel for the RPC protocols (`toRpcError`, `RpcErrorCode`). |
| [`src/trpc/init.ts`](src/trpc/init.ts) | tRPC base: `publicProcedure` / `protectedProcedure`, error middleware + formatter. |
| [`src/trpc/router.ts`](src/trpc/router.ts) | tRPC router (`health`, `billing`). |
| [`src/trpc/adapter.ts`](src/trpc/adapter.ts) | Hono mount for tRPC (`/api/trpc`). |
| [`src/trpc/context.ts`](src/trpc/context.ts) | `TrpcContext` ( `{ tenant }` ). |
| [`src/orpc/init.ts`](src/orpc/init.ts) | oRPC base: `publicProcedure` / `protectedProcedure`, `guarded` error middleware. |
| [`src/orpc/router.ts`](src/orpc/router.ts) | oRPC router (`health`, `billing`). |
| [`src/orpc/adapter.ts`](src/orpc/adapter.ts) | Hono mount for oRPC (`/api/rpc`). |
| [`src/orpc/context.ts`](src/orpc/context.ts) | `OrpcContext` ( `{ tenant }` ). |
| [`src/middlewares/tenantContext.ts`](src/middlewares/tenantContext.ts) | `tenantContextMiddleware` — single source of tenant context for all protocols. |
| [`src/middlewares/usageMetering.ts`](src/middlewares/usageMetering.ts) | `getUsageSnapshot` — shared data source behind `billing.getUsage`. |
| [`src/__tests__/protocols.test.ts`](src/__tests__/protocols.test.ts) | Tests the enablement matrix and the cross-protocol parity/error contract. |
