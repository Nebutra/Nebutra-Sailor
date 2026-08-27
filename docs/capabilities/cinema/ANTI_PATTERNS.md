# Anti-patterns — `cinema` absorption

## 1. Don't PORT infrastructure a prior codename already owns

The source ships its own media DAG, script→shots splitter, multi-agent
orchestration, provider config, and file-state. Sailor already had ≥80 % of
that (`reel`, `agents`, `agent-runtime`, `queue`, `tenant-store`). Porting it
would have duplicated facts across codenames. Only the *differentiated film
IP* (camera-continuity tree, consistency-ranked frame pick, novel
segmentation, director template) is PORT; everything else is SKIP/WRAP. Always
run the coverage audit before declaring a PORT.

## 2. Inject every model/IO touchpoint — keep the IP pure

The source binds agents to Google Veo/Gemini and to a file-based working dir.
`@nebutra/cinema` takes `InferParents` / `RankFrames` / `CompleteFn` /
`renderShot` as injected functions — no provider import, no fs, no
`tenantId`. Result: the IP is unit-testable with deterministic stubs (11/11
without a network) and tenant-agnostic (the caller's `@nebutra/agents`
instance carries tenancy). Re-expressing a research file-pipeline as an
injected, pure orchestrator is the absorption, not a port of its plumbing.

## 3. Reuse the neutral acyclic guard, don't re-derive it

The camera tree must be acyclic (a parent's footage can't depend on its
descendant). Rather than hand-roll cycle detection, `buildCameraTree`
incrementally guards with `@nebutra/graph-model` `wouldCreateCycle` — the
same primitive `reel`/`ui` use. This is the governance layering from the
prior rounds paying off: a new capability composes the shared lower layer
instead of growing a fourth copy of DFS cycle detection.

## 4. A model contract breach must fail loud

`selectBestFrame` throws `CinemaError` if the injected ranker returns an id
that isn't a candidate; `extractScenes` throws if the model output isn't a
parseable JSON string array (a silent empty list would drop story). Absorbed
research code tended to log-and-continue; for a multi-tenant product a
dropped scene or wrong frame must surface, not pass silently.
