/**
 * /reel — node-graph + storyboard generative-media studio (demo).
 *
 * Gated by FLAGS.REEL_STUDIO (off by default). `notFound()` when disabled so
 * the route neither renders nor advertises itself — the same pattern as
 * /atelier. The demo splits a script into shots, builds a typed node graph
 * (storyboard → gen-image nodes) carrying NODE_IO_ENVELOPE outputs, all with
 * the mock provider so no AI key is needed.
 */

import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { AnimateIn } from "@nebutra/ui/components";
import { PageHeader } from "@nebutra/ui/layout";
import { notFound } from "next/navigation";
import { ReelStudio } from "@/components/reel/reel-studio";
import { getAuth, getTenantContext } from "@/lib/auth";

export default async function ReelPage() {
  const { userId } = await getAuth();
  const { tenantId, plan } = await getTenantContext();

  const enabled = await isFeatureEnabled(FLAGS.REEL_STUDIO, {
    userId: userId ?? undefined,
    tenantId: tenantId ?? undefined,
    plan: (plan?.toLowerCase() || "free") as "free" | "pro" | "enterprise",
  });
  if (!enabled) notFound();

  return (
    <section className="mx-auto w-full max-w-[1400px]">
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Reel"
          description="Split a script into shots — each becomes a typed node whose generated output flows through a versioned IO envelope."
        />
      </AnimateIn>
      <AnimateIn preset="emerge">
        <ReelStudio graphId="demo" />
      </AnimateIn>
    </section>
  );
}
