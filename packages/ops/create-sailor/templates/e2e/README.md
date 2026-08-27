# e2e

Playwright end-to-end tests for `{PRODUCT_NAME}`.

| Folder | Scope |
|--------|-------|
| `smoke/` | Fast smoke tests — must pass on every PR |
| `golden/` | Critical-path "golden" flows (signup → first action → billing) |
| `sleptons/` | Sleptons-specific scenarios (skip if Sleptons is disabled) |

Run with `pnpm exec playwright test --config=playwright.config.ts`.
