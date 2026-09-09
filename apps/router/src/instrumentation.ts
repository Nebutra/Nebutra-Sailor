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
}
