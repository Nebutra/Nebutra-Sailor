/**
 * Next.js instrumentation hook — runs once per process.
 *
 * The Router's whole money spine (balance guard, debit, ledger) goes through
 * `@nebutra/billing`, which refuses to touch a database until the host injects
 * one. Without `configureBillingTenantDb` every credits call throws
 * "requires a host tenant DB". This is that injection point; it mirrors
 * `apps/web/src/instrumentation.ts`.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { configureBillingTenantDb } = await import("@nebutra/billing");
    const { getTenantDb } = await import("@nebutra/db");
    configureBillingTenantDb(getTenantDb);
  } catch (err) {
    process.stderr.write(
      `[router] Billing storage init failed — credits calls will throw: ${
        err instanceof Error ? err.message : String(err)
      }\n`,
    );
  }

  // Supply bootstrap (ADR 2026-09-30 "Event-driven execution" §4): a freshly
  // deployed environment whose supply registry has never been seeded gets its
  // built-in sources discovered without waiting for the next 03:00 cron or an
  // operator ssh-ing in to probe by hand. Not awaited — a slow or unreachable
  // gateway must never delay Router's own process boot; `maybeEmitBootstrap`
  // is itself try/catch-guarded and a no-op after its first check per process.
  void import("./lib/supply/capability")
    .then(({ maybeEmitBootstrap }) => maybeEmitBootstrap())
    .catch((err) => {
      process.stderr.write(
        `[router] Supply bootstrap check failed: ${
          err instanceof Error ? err.message : String(err)
        }\n`,
      );
    });
}
