# Admin console productization — Vercel-grade control plane

## Goal

Turn `admin.nebutra.com` from a configuration read-out into a control plane a
platform operator lives in: one shell, live numbers, every resource a page,
every write an audited action. Benchmark: Vercel / Linear / PlanetScale
dashboards — monochrome, dense, fast, nothing decorative.

## Users (from the 2026-07-28 PRD §3)

Platform staff only, four tiers: `platform_readonly` · `platform_support` ·
`platform_operator` · `platform_owner`. No tenant ever sees this app.

## Best-practice bar (what "Vercel-grade" means here)

| Principle | Concretely |
|---|---|
| One shell | 48 px top bar (mark · breadcrumb · env · ⌘K · user) + tab row; content column max 1400 px. Every page shares it. |
| Overview answers "is anything wrong?" in 3 s | 4 metric tiles → an *Attention* list (only real anomalies) → activity feed. Empty attention list is the good state, not a filler. |
| Every number is live | No number renders unless a probe or query produced it. Config-only values are labelled *configured*, never green. |
| Resource pages share one anatomy | List (filters · dense table · status dot) → detail (header with actions · key facts · tabs). |
| Actions are explicit and audited | Buttons name the verb (Suspend, Impersonate 15 min, Sync channel). Destructive ones confirm inline. Every write emits an audit event first. |
| Role-aware chrome | Read-only tier sees no write buttons at all (not disabled — absent). |
| Keyboard-first | ⌘K command palette: jump to page, find tenant, run action. |
| Light + dark, monochrome | Nebutra's `vercel` design language (`html[data-brand="vercel"]`): paper/obsidian, hairline elevation, no chromatic CTA. Status colours are the only hue. |
| Loading / empty / error are designed | Skeleton rows on load, one-line empty states, error states with the failing probe named. |

## Information architecture

Tabs (order = frequency of use): **Overview · Fleet · Supply · Tenants · Staff · Audit**.
"Router" and "Forge" from the original IA fold into Supply (engines, channels,
aliases, shelf) and a later Forge tab; no tenant switcher.

## Scope

**Batch 1 (this task):** shell, Overview, live Fleet (health probes +
drift), Supply (engines · account pool · channel sync · shelf), ⌘K jump.
**Batch 2 (with `09-08-admin-sso-login`):** Tenants list/detail with
suspend · impersonate · feature-flag override, Staff grants, Audit log.

## Constraints

- Closure phase: no new package, no new product noun. Everything in
  `apps/admin` + existing `@nebutra/ui` layout/patterns; add missing pieces
  to `@nebutra/ui` only if generic.
- Data only from existing sources: `brand.domains`, deploy-target resolver,
  per-app health routes (add `/api/health` where missing), gateway
  `/v1/admin/*`, `@nebutra/audit`, `router-supply`, CLIProxyAPI + New-API
  over 6PN.
- Auth model unchanged: Cloudflare Access → PlatformStaff. SSO switch is the
  sibling task.

## Acceptance

- [ ] Shell renders on every route; active tab reflects route; ⌘K opens and jumps.
- [ ] Overview: four tiles all backed by real probes/queries; Attention list shows drift, unreachable engine, failed deploy, expired staff grant; activity feed reads the audit log.
- [ ] Fleet: health column is probed (status, version, latency) with a visible "probed 12 s ago"; unprobeable rows say *no health endpoint*, never green.
- [ ] Supply: engine cards with live reachability; account table from CLIProxyAPI auth files (provider · account · status · last used); Sync channel button with result toast; shelf preview = New-API `/v1/models` ∩ catalog.
- [ ] `platform_readonly` sees no write control anywhere.
- [ ] Light and dark both pass the CSS var-type audit; no hardcoded hex.
- [ ] Storybook stories for any new `@nebutra/ui` piece; admin tests cover role-gating of the Supply actions.
