/**
 * /atelier — agentic creative-canvas demo.
 *
 * Gated by FLAGS.ATELIER_CANVAS (off by default). When disabled the route
 * `notFound()`s so it neither renders nor advertises its existence — the
 * established pattern for flag-gated surfaces in this app.
 *
 * The demo proves the absorbed product form: a prompt produces a generated
 * asset that the SERVER places at a non-overlapping position and persists
 * before the client is told. Generation uses the mock provider, so no AI
 * provider key is required to see it work.
 */

import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { AnimateIn } from "@nebutra/ui/components";
import { PageHeader } from "@nebutra/ui/layout";
import { notFound } from "next/navigation";
import { AtelierCanvas } from "@/components/atelier/atelier-canvas";
import { getAuth, getTenantContext } from "@/lib/auth";

export default async function AtelierPage() {
  const { userId } = await getAuth();
  const { tenantId, plan } = await getTenantContext();

  const enabled = await isFeatureEnabled(FLAGS.ATELIER_CANVAS, {
    userId: userId ?? undefined,
    tenantId: tenantId ?? undefined,
    plan: (plan?.toLowerCase() || "free") as "free" | "pro" | "enterprise",
  });
  if (!enabled) notFound();

  return (
    <section className="mx-auto w-full max-w-[1400px]">
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Atelier"
          description="Describe what you want — the agent generates it and the server places it on the canvas."
        />
      </AnimateIn>
      <AnimateIn preset="emerge">
        <AtelierCanvas canvasId="demo" />
      </AnimateIn>
    </section>
  );
}
