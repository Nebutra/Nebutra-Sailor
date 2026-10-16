# Project rules

These are the rules a Sailor scaffold is built on. The project's own
`AGENTS.md`, `CLAUDE.md`, `DESIGN.md` and package READMEs are authoritative;
read the one for the layer you are changing.

## Layout

```
apps/web          product app (sign-in, workspace, settings)
apps/landing      marketing site; words in apps/landing/messages/en.json
backends/gateway  Hono API: every business endpoint
packages/<category>/<name>   shared libraries (design, iam, commerce, integrations, platform, ops, ai)
```

## One provider per domain

Each capability has exactly one provider; its env keys decide whether it is
live, and without them it falls back to a local implementation.

| Domain | Provider |
|---|---|
| Auth | Better Auth |
| Payments | Creem (cards, merchant of record) + WeChat Pay / Alipay (mainland China) |
| SMS | Twilio Verify + Aliyun (mainland China) |
| Object storage / uploads | one S3-compatible adapter (Cloudflare R2, Aliyun OSS) |
| Email | Resend (console sink locally) |
| Queue / cache | QStash (memory locally) / Redis |
| Search | Postgres (pgvector + full-text) |
| Monitoring / analytics / captcha | Sentry / PostHog / Turnstile |
| Permissions | CASL, in-process |

The pairs exist only because law or network force them. Do not add an
alternative adapter, a provider flag or a region switch. If the user needs a
different vendor, say that it means writing an adapter against the kept
interface and replacing the shipped one, and confirm before doing it.

## API: the gateway

Business endpoints go in `backends/gateway` (Hono). In development the gateway
is mounted inside `apps/web` at `app/api/[[...route]]` (`GATEWAY_MODE=embedded`,
the default) and also runs on its own port; `GATEWAY_MODE=external` deploys it
separately. Next route handlers in `apps/web` are for what is intrinsically
Next: auth callbacks, OG images, framework hooks.

## Database

- One source: `packages/platform/db/prisma/schema.prisma`. Read
  `packages/platform/db/README.md` before changing it.
- Every table carries its access rule. A model with `tenant_id`,
  `organization_id`, or one required relation to such a model is isolated
  automatically. Anything else needs a `/// @rls` line above `model`:
  `global`, `deny`, `off`, `self`, `tenant(col)`, `via(field)`, `using(sql)`,
  or `read(sql) write(sql)`. Without it `prisma generate` fails.
- Row-level security is generated into `prisma/generated/rls.sql`. Commit it;
  never edit it.
- Migrations are generated, never hand-written:
  `pnpm --filter @nebutra/db db:migrate --name <what_changed>`, then
  `pnpm --filter @nebutra/db db:generate`. No `CREATE POLICY`, RLS switch,
  function or `GRANT` in a migration.
- Deploys run `pnpm db:deploy` before the apps; it fails on drift.
- Core domains (users, teams, tenancy, billing, quota, agent runs, uploads) go
  through the repository seam in `packages/platform/repositories`; simple CMS
  or config reads may use Prisma directly.

## UI

- Components: `@nebutra/ui/primitives` (Button, Input, Select, Field, …),
  layout wrappers from `@nebutra/ui/layout`, patterns from
  `@nebutra/ui/components`.
- Icons: `@nebutra/icons`. Do not add `lucide-react`.
- Form controls: never raw `<input>`, `<textarea>` or `<select>` under `apps/`.
  Use the primitives. A hidden or file input may opt out with
  `data-allow-native`.
- Colour: semantic utilities (`bg-background`, `text-foreground`,
  `border-border`, `bg-primary text-primary-foreground`) or the 12-step scales
  (`bg-neutral-3`, `text-neutral-12`). No raw hex.
- Semantic tokens such as `--background`, `--primary`, `--ring` hold bare HSL
  channels, not colours. `bg-[var(--background)]` voids the whole declaration
  silently; write `bg-background`, or `hsl(var(--primary))` in hand-written
  CSS.
- Entrance motion: `AnimateIn` / `AnimateInGroup` from `@nebutra/ui/components`,
  not raw `motion.div` with hand-picked values.
- Focus rings come from a global `:focus-visible` rule; do not add
  component-level focus rings.
- New UI components get a Storybook story.
- Colours and type change in `packages/design/design-tokens/tokens/` (light
  and dark together), never in the generated `packages/design/tokens/styles.css`.

## Copy

User-facing copy in `apps/web` avoids generic empty states ("No X yet"),
corporate filler, emoji and shouting; `pnpm lint` enforces the mechanical part.
A file that is genuinely not user-facing may carry a top-level
`// @microcopy-exempt: <reason>` comment.

## Guards

`pnpm lint` runs Biome and the governance ratchets configured in
`governance.config.json` (raw inputs, repository seam, brand literals,
microcopy). Their allowlists may only shrink: fix the code rather than adding
an entry, and remove an entry when you fix the file it names.

## China

Mainland China is configuration, not a different scaffold. Both adapters of
each pair ship in the code: WeChat Pay / Alipay and Aliyun SMS go live from
their own keys, side by side with Creem and Twilio Verify.

- Set `NEBUTRA_LOCALE=cn` for a mainland deployment; `nebutra status` reports
  the locale.
- The ICP filing number renders in the site footer when
  `NEXT_PUBLIC_ICP_NUMBER` is set (and `NEXT_PUBLIC_PUBLIC_SECURITY_RECORD` for
  the 公安备案 number); with neither set, nothing renders.
- Region helpers, ICP formatting and WeChat OAuth URLs live in
  `packages/ops/china-compliance` (read its README). Before telling the user a
  China surface is on, check in the code that something reads the switch you
  set.

## Secrets

Keys live in `.env.local` (git-ignored). Never commit a key, never put one in
code, and never invent one to make a capability report `live`.
