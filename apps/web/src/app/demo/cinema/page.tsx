import { runFilmPipeline } from "@nebutra/cinema";
import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { Card } from "@nebutra/ui/layout";
import { connection } from "next/server";

/**
 * Demo route for the `cinema` capability absorption (codename `cinema`).
 *
 * Off by default (FLAGS.CINEMA_DEMO). When enabled it runs the real
 * `runFilmPipeline` with deterministic in-process mock steps (NO model, NO
 * network, NO tenant writes) — the package is fully dependency-injected, so
 * the demo proves the orchestration + acyclic camera tree without any
 * provider. Real use wires the steps to @nebutra/agents.
 */
export default async function CinemaDemoPage() {
  await connection();
  const enabled = await isFeatureEnabled(FLAGS.CINEMA_DEMO);

  if (!enabled) {
    return (
      <main className="min-h-screen bg-muted p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <Card className="p-6">
            <h1 className="font-semibold text-xl">Cinema — disabled</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              The <code>cinema</code> capability demo is behind a feature flag (
              <code>{FLAGS.CINEMA_DEMO}</code>) and is off by default. Enable it per tenant to run
              the film-director pipeline.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  const film = await runFilmPipeline(
    { idea: "a lighthouse keeper befriends a storm petrel" },
    {
      writeScript: async (idea) => `SCREENPLAY — ${idea}`,
      splitShots: async (script) => [
        `${script} :: shot 0`,
        `${script} :: shot 1`,
        `${script} :: shot 2`,
      ],
      buildCameras: async (shots) => shots.map((_, i) => ({ id: `cam${i}`, shotIds: [`s${i}`] })),
      inferParents: async (cams) =>
        cams.map((c, i) => ({
          cameraId: c.id,
          parentCameraId: i === 0 ? null : `cam${i - 1}`,
          parentShotId: i === 0 ? null : `s${i - 1}`,
          fullyCovers: true,
        })),
      renderShot: async (shot, i) => ({ uri: `mp4:mock/shot-${i}` }),
    },
  );

  return (
    <main className="min-h-screen bg-muted p-8 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="font-semibold text-2xl">Cinema — film-director pipeline</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            <code>runFilmPipeline</code> with deterministic injected steps — no model, no network.
            Camera tree is acyclic + root-anchored (guarded via <code>@nebutra/graph-model</code>).
          </p>
        </header>

        <Card className="p-6">
          <h2 className="font-medium">Script</h2>
          <p className="mt-2 text-muted-foreground text-sm">{film.script}</p>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium">Shots → clips</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {film.clips.map((c) => (
              <li key={c.uri} className="flex justify-between">
                <span className="text-muted-foreground">{c.shot}</span>
                <code>{c.uri}</code>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium">Camera-continuity tree</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            root: <code>{film.cameraTree.rootId}</code> · cameras:{" "}
            <code>{film.cameraTree.cameras.length}</code>
          </p>
        </Card>
      </div>
    </main>
  );
}
