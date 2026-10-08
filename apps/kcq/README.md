# KCQ product workbench

Nebutra's product shell (shared React navigation with the canonical Vue chart) around the canonical KCQ chart library. Account
identity and organization membership come from `@nebutra/auth/browser` and
the shared auth center. No independent user store or auth secret is created.

Set `KCQ_SOURCE_DIR` to a checkout of the canonical repository with the
browser persistence-scope API, then run `pnpm --filter @nebutra/kcq build`.
The deploy workflow checks out an immutable revision, installs its toolchain,
and builds this app, rather than the library preview. KCQ source aliases are
generated from the upstream export map. Product code imports public APIs.

Honesty layer: organization membership is validated by Better Auth; local
layouts, watchlists, chart preferences and Agent sessions are partitioned by
account and workspace. Workspace changes reload the page to discard singleton
caches. These are browser-local preferences, not cloud synchronization or a
permission boundary against same-origin scripts. Organization provisioning,
team administration and billing remain in Nebutra. Live market connectors
and managed AI credentials are not provisioned by this shell.

Frontend layout and interaction requirements live in [DESIGN.md](./DESIGN.md).
