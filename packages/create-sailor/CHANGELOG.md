# create-sailor

## 1.3.6

### Minor Changes

- Sync the CLI with the wave 3-5 features shipped across `apps/web`, `apps/landing-page`, and `packages/*`:
  - **Mail** — Resend + React Email templates rendered through `@nebutra/email`, mail-preview app refresh.
  - **Cron jobs** — scheduled handlers wired through `@nebutra/queue` + `vercel.json` crons. Toggle with `--cron-jobs=<bool>`.
  - **Billing polish** — pricing-plan grid, checkout route, active-plan endpoint, plan-aware UI gates.
  - **Auth expansion** — magic link, passkeys, set-password, forgot/reset-password, verify-email, email change verification flows.
  - **App shell + onboarding** — design-system shell provider, create-workspace step, refreshed not-found and global-error.
  - **Admin** — organizations + users admin pages, `/api/admin/impersonate` route + tests.
  - **Audit log** — `/settings/audit-log` viewer + architecture test. Toggle with `--audit-log=<bool>`.
  - **API keys** — `/settings/api-keys` lifecycle page. Toggle with `--api-keys=<bool>`.
  - **Notifications** — multi-channel preferences page + in-app inbox.
  - **Webhooks** — `/settings/webhooks` management surface backed by `@nebutra/webhooks`.
  - **Command palette** — ⌘K palette across the dashboard. Toggle with `--command-palette=<bool>`.
  - **Cookie consent + legal** — GDPR/CCPA banner and dynamic `/legal/[slug]` rendered from `@nebutra/legal`. Toggle with `--cookie-consent=<bool>` and `--legal-pages=<bool>`.
  - **GDPR data export** — `/settings/account/export` and `/api/account/*` routes.
  - **China compliance** — new `@nebutra/china-compliance` package (ICP footer, region detection, WeChat OAuth scaffolding). Toggle with `--china-compliance=<bool>`; auto-enabled when `--region=cn`.
  - **SEO + landing polish** — Vercel-style soft section anchoring, refreshed metadata, registry phase 1 components.
- Done card now surfaces a "What you can do next" section with deep links into the new settings pages.
- `package-status.ts` registers `@nebutra/china-compliance` as `foundation` so the CLI prints the readiness banner when it is enabled.

## 1.3.3

### Patch Changes

- Fix provider template generation and refresh create-sailor onboarding docs and help examples.

## 1.3.2

### Patch Changes

- [#57](https://github.com/Nebutra/Nebutra-Sailor/pull/57) [`1cd5e0e`](https://github.com/Nebutra/Nebutra-Sailor/commit/1cd5e0efbe9ef61bed123fa12543d7f1f3d31b08) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Ship the refreshed scaffold onboarding guidance and harden remote template fetching to use immutable GitHub archives with trusted publishing-ready release plumbing.
