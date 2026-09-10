# Brand hardcode governance

## SSOT

| Concern | Source | Helper |
|---------|--------|--------|
| Name | `@nebutra/brand` | `brand.name` |
| Hosts | `brand.domains` | `getBrandOrigin`, `getBrandPublicUrls` |
| Cookie | landing apex | `getBrandCookieDomain` |
| Email | landing apex | `getBrandEmail`, `getBrandMailFrom` |
| Analytics | `brand.domains.analytics` | `getBrandOrigin("analytics")` |
| Colors | tokens / `colors` | `var(--brand-*)` or `colors.primary["500"]` |
| DNS | domains + topology | `pnpm dns:render` |
| Vercel | domains | `pnpm brand:apply` |

## Runtime rule

Never hardcode product hosts, brand names, mailboxes, cookie domains, or brand hex in apps/packages/gateway.
Route through `@nebutra/brand` helpers.

## Lint (shrink-only)

- Engine: `scripts/governance/lint-brand-literals.mjs`
- Paths: apps, packages/{commerce,integrations,platform,ops,iam}, backends/gateway
- Escape: `// @brand-exempt: <reason>`
- Allowlist may only shrink

## Rebrand

```bash
pnpm brand:apply && pnpm dns:render
```
