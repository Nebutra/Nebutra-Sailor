# Replication Guide — build an agentic video-creation product on Sailor

Audience: an engineer who wants the ViMax-style form (idea/script/novel →
multi-shot video with cross-shot continuity) without re-reading the research
code. Every model/IO touchpoint is injected — wire it to `@nebutra/agents`.

## 5-minute quickstart (film-director pipeline)

```ts
import { runFilmPipeline } from "@nebutra/cinema";
import { generateText } from "@nebutra/agents";          // your configured LLM
import { splitScriptIntoShots } from "@nebutra/reel/storyboard";

const film = await runFilmPipeline(
  { idea: "a lighthouse keeper befriends a storm petrel" },
  {
    writeScript: (idea) => generateText(`Write a short screenplay: ${idea}`),
    splitShots: (script) => splitScriptIntoShots(script, { complete: generateText }),
    buildCameras: async (shots) => shots.map((_, i) => ({ id: `c${i}`, shotIds: [`s${i}`] })),
    inferParents: async (cams) =>
      cams.map((c, i) => ({
        cameraId: c.id,
        parentCameraId: i === 0 ? null : `c${i - 1}`,   // model call in prod
        parentShotId: i === 0 ? null : `s${i - 1}`,
        fullyCovers: true,
      })),
    renderShot: async (shot) => ({ uri: await myVideoProvider(shot) }),
  },
);
// film.cameraTree (acyclic, root-anchored), film.clips, film.script, film.shots
```

## The differentiated pieces

- **Camera-continuity tree** — `buildCameraTree(cameras, inferParents)`:
  parent inference is your model call; the acyclic + single-root invariants
  are enforced locally (reusing `@nebutra/graph-model`). `resolveContinuityChain(tree, id)`
  gives the root→shot frame-inheritance order so a later shot reuses an
  earlier camera's frames.
- **Best-frame selection** — `selectBestFrame(candidates, desc, rank)`:
  generate N frames via `@nebutra/agents` `generateImage`, inject an MLLM
  `rank`; the winner is validated to be a real candidate (no silent wrong pick).
- **Novel adaptation** — `compressNovel(chunks, complete)` then
  `extractScenes(text, complete)`; pair with `@nebutra/knowledge-rag` for
  retrieval-augmented long-form context (injected, not a hard dep).

## What you reuse (do NOT rebuild)

`@nebutra/reel` (media DAG + storyboard split), `@nebutra/agents`
(LLM + image/video generation registry — register a real Veo/Kling/FAL
provider), `@nebutra/queue` (offload long renders), `@nebutra/atelier-canvas`
(place generated assets), `@nebutra/tenant-store` (isolation). Audio
(`@nebutra/tts`) and final mux (`@nebutra/video-compose`) are the scheduled
follow-on packages.
