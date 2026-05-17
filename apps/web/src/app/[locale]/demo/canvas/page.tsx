import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { Card } from "@nebutra/ui/layout";
import { connection } from "next/server";
import { CanvasDemoClient } from "./canvas-demo-client";

/**
 * Demo route for the `canvas` capability absorption (codename `canvas`):
 * the interactive node-graph editor (@nebutra/ui NodeGraphCanvas) bound to
 * the existing @nebutra/reel model.
 *
 * Off by default (FLAGS.CANVAS_DEMO). When disabled, renders a notice only.
 * Companion capabilities (@nebutra/knowledge-rag, @nebutra/collab) are
 * library-level and not surfaced here — see docs/capabilities/canvas/.
 */
export default async function CanvasDemoPage() {
  await connection();
  const enabled = await isFeatureEnabled(FLAGS.CANVAS_DEMO);

  if (!enabled) {
    return (
      <main className="min-h-screen bg-[color:var(--neutral-2)] p-8 text-[color:var(--neutral-12)]">
        <div className="mx-auto max-w-4xl">
          <Card className="p-6">
            <h1 className="font-semibold text-xl">Canvas — disabled</h1>
            <p className="mt-2 text-[color:var(--neutral-11)] text-sm">
              The <code>canvas</code> capability demo is behind a feature flag (
              <code>{FLAGS.CANVAS_DEMO}</code>) and is off by default. Enable it per tenant to view
              the interactive node-graph editor over <code>@nebutra/reel</code>.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--neutral-2)] p-8 text-[color:var(--neutral-12)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="font-semibold text-2xl">Canvas — node-graph editor</h1>
          <p className="mt-1 text-[color:var(--neutral-11)] text-sm">
            Interactive <code>@xyflow/react</code> editor, controlled by an immutable{" "}
            <code>ReelGraph</code>. No new data model — consumes <code>@nebutra/reel</code>{" "}
            verbatim.
          </p>
        </header>
        <CanvasDemoClient />
      </div>
    </main>
  );
}
