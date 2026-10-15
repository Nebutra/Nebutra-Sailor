import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { Card } from "@nebutra/ui/primitives";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
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
  const tc = await getTranslations("copy.canvasPage");
  await connection();
  const enabled = await isFeatureEnabled(FLAGS.CANVAS_DEMO);

  if (!enabled) {
    return (
      <main className="min-h-dvh bg-muted p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <Card className="p-6">
            <h1 className="font-semibold text-xl">{tc("canvasDisabled")}</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {tc("the")} <code>{tc("canvas")}</code> capability demo is behind a feature flag (
              <code>{FLAGS.CANVAS_DEMO}</code>) and is off by default. Enable it per tenant to view
              the interactive node-graph editor over <code>{tc("nebutraReel")}</code>.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-muted p-8 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="font-semibold text-2xl">{tc("canvasNodeGraphEditor")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {tc("interactive")} <code>{tc("xyflowReact")}</code> {tc("editorControlledByAn")}{" "}
            <code>{tc("reelGraph")}</code>. No new data model — consumes{" "}
            <code>{tc("nebutraReel")}</code> {tc("verbatim")}
          </p>
        </header>
        <CanvasDemoClient />
      </div>
    </main>
  );
}
