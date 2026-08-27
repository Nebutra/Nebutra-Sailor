# Startup OS SSOT

Source of truth: `packages/ai/startup-os` (`@nebutra/startup-os`).

`apps/web/src/lib/startup-os/*` is a **thin re-export** layer for legacy `@/lib/startup-os/...` imports. Do not add logic there — edit the package and rebuild (`pnpm --filter @nebutra/startup-os build`).

