# @nebutra/mail-preview

Internal dev tool — live preview for `@nebutra/email` templates. Think Storybook for emails.

Two modes ship in this package:

1. **Next.js preview app** (`pnpm dev`) — interactive sidebar + iframe preview + JSON props editor.
2. **Static export scripts** (`pnpm check / export / render:react`) — generate `dist/*.html` snapshots
   for CI verification or static hosting.

## Run the live preview app

```bash
pnpm --filter @nebutra/mail-preview dev
# → http://localhost:3010
```

Features:
- Auto-discovers React-Email-style templates from the `REACT_EMAIL_TEMPLATES` registry in
  `@nebutra/email`.
- Sidebar lists every template; main pane has tabs: **Preview / Plain Text / HTML Source / Props**.
- Iframe sandbox isolates email styles from the host app.
- Props editor — edit JSON props live, the preview re-renders.
- Dev-only `POST /api/send-test` route uses the project's email provider (gated by
  `NODE_ENV !== "production"`).

## Static export (legacy)

```bash
pnpm --filter @nebutra/mail-preview render:react   # render React-Email templates → dist/*.html
pnpm --filter @nebutra/mail-preview export         # build dist/index.html + preview-manifest.json
pnpm --filter @nebutra/mail-preview check          # verify every catalog entry has a snapshot
```

## Adding a template

1. Create the template module under `packages/email/src/templates/<name>.tsx` exporting
   `subject`, `preview`, `render`, plus the `Props` interface.
2. Add an entry to `REACT_EMAIL_TEMPLATES` in `packages/email/src/templates/index.ts`.
3. Add fixture props in `apps/mail-preview/src/lib/fixtures.ts`.
4. Refresh the preview app — the template appears automatically in the sidebar.
