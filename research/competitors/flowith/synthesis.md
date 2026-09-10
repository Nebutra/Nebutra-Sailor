# Flowith — competitor synthesis (authenticated track, 2026-09-08)

Account: owner's Free plan, **0 credits** — so every generation path was observed up to the credit gate, not through a successful run. Two runs were attempted (both Chat, GPT 4.1); the second produced the full failed-job lifecycle. Existing flows (tutorial "Welcome to flowith 2.0", the owner's Neo Agent run "Quant System PRD") supplied completed-state evidence. Product is dark/light via OS; captures are light on home/tutorial, dark later (OS switched — O, not a product change).

## 1. Core unit of work — **Flow** (O)
- Route `/conv/<uuid>`; created on the *first Send* from `/blank` before any node exists; auto-titled from the first prompt; listed in sidebar History and `/flows`. `evidence/canvas.new.sent-t8.webp`, `library.default.webp`.
- "New Flow" in the sidebar is just `/blank` — the home composer *is* the new-flow screen (O).
- A flow is a **React Flow tree** (`rf__node-<uuid>`, dashed parent→child edges, invisible root node with the flow's uuid). Every prompt, answer, image, agent step, agent output, comment thread and follow-up draft is a node (O). `evidence/canvas.welcome.fit.webp`.
- Chrome ≈ 12 % of viewport (5 % minimized); sidebar auto-collapses on entering a flow (O). `ux/density.yaml`.

## 2. Persistence boundary (O)
- Server-side, per flow: nodes, edges, comments, share state, **viewport zoom**, and even a Follow-Up draft node and a failed answer node (33→34 nodes after reload; zoom 25 % restored). `evidence/canvas.welcome.reloaded.webp`, `canvas.new.reloaded.webp`.
- Assets in Supabase public storage (O). Media History is account-level by day (`/gallery`) with a flow-scoped drawer in the canvas (I2). Knowledge Garden is account-level (O).
- Client-side only: last mode, preferred model per mode, cached model catalog (localStorage) (O).
- U: trash/soft-delete, node history, in-flight job survival across navigation.

## 3. Reusable identity — **Knowledge Garden** (O/I2)
- Account-level knowledge bases ("projects" of files), shareable, with a public **Knowledge Market** (`/community`, tabs knowledge-garden | oracle) of gardens like "Paul Graham's Essays" (O). `evidence/knowledge-market.oracle.webp`, `canvas.welcome.knowledge-dock.webp`.
- Tutorial answers are "based on the provided knowledge base" (O) → gardens are the persistent context object; there is no character/style/subject library (I2). Image mode has a per-run "Style +" image slot instead (O).
- "Composer" (title-bar menu → "New Composer") is a second reusable object whose shape is unknown (U).

## 4. Generation result object — **a child node** (O)
- Send creates the prompt node **and** an empty answer node simultaneously; the answer node is the job container and its terminal state (content with model+date footer, or a "Need a refill? … 0 Credits · View pricing" card) is written in place and persisted (O). `evidence/canvas.new.sent-t2.webp`, `sent-t8.webp`.
- Failed node toolbar = Delete only; Rerun exists on completed answer/step nodes (O). No job list/queue; no pre-run credit number — only a Vary sentence "1 Generation with 1:1 ratio in Seedream 5.0 Pro" and the batch multiplier (O).
- Batch >1 → sibling nodes under one prompt (I2; tutorial shows 8 image siblings; Vary batch 2X/4X locked on Free).
- **Selection = quotation (O):** clicking a node adds a removable token to the composer ("Focus node …"); tokens accumulate; Settings calls it *Node Interaction Mode: Quote first*. `evidence/canvas.welcome.answer-node-selected.webp`.
- **Follow Up (F / "Branch node") (O):** highlights the ancestor chain, creates a draft prompt node, injects a "Follow-up with 6 nodes" lineage token, and switches the composer to the source node's mode. `evidence/canvas.welcome.follow-up.webp`.
- Model catalog (client cache, 70 models, prices in internal credits; text per token, image/video flat) → `raw/global-models.txt`, summarised in `business/generation.md` (O).

## 5. Agent role — **Neo, plan projected as nodes** (O)
- Entry: "Neo Agent" chip → `Auto · Neo Agent` (Auto/Text/Image/Video/Slides/Website output format), MAX toggle; Image mode also has an "Agent off" toggle (O). `evidence/home.mode-neo-agent.webp`.
- Completed run structure: prompt → step-label node → **Group 1** (six parallel research nodes) → ten sequential step-label nodes each followed by an output document node (version strings 1.0.0/2.1.0) → Sandbox Preview node (flo.fun website). Badge "Powered by Neo". **No plan panel, task list or timeline exists** — the plan is the node chain, parallelism is a named Group (O). `evidence/canvas.quant.overview.webp`, `canvas.quant.fit.webp`, `canvas.quant.bottom.webp`.
- Step-label nodes have Rerun · Edit · Delete; outputs are ordinary quotable nodes (O).
- U: approval gate before execution, live/streaming rendering, cancel, editing during a run.

## 6. Canvas role — **the only workspace** (O)
- There is no document/editor view apart from the canvas; text editing of a node is the (paid) "Edit / E" action on the node itself (O — Free shows "Upgrade to unlock"). `evidence/canvas.welcome.text-node-edit.webp`.
- Canvas chrome: title bar (logo menu · flow switcher · Share dialog · Comment mode · Minimize | Organize Nodes ⌘O · zoom menu ⌘0/⌘1/↑↑/↓↓ · Composer menu), left dock (Free Node → Text/Upload · Search Node modal with All/Text/Media counts + Export · Media History drawer · Knowledge Garden modal), bottom composer, pane right-click (Paste · Organize · zoom) (O). Colour tags (5) are the only manual node metadata (O). No node-level context menu found (U).

## 7. Professional tool entry — **on the image node** (O)
- Image toolbar: Crop · Upscale▾ · Background Removal · Vary▾ · Rerun · Copy Content · Download · Delete (O). Vary is a node-anchored mini form (batch, ratio, top-model shortlist, cost sentence, Run) (O). `evidence/canvas.welcome.image-node-selected.webp`, `image-vary-menu.webp`.
- Home "Apps" rail re-packages the same tools as tasks (Background Remover, Image Upscaler, Crop & Resize, Photo Relighting, Virtual Try-on, …) (O). Upscale menu contents: U.

## 8. Review / versioning (O/U)
- Comparison is spatial: siblings side by side under a prompt; Search Node filters by type (O). No compare/diff view, no node version history (U). Version strings appear only inside agent-authored documents (O).
- Sharing: flow link, "Anyone with this link" + "can view", member list (O). Comments: mode toggle, thread bubble with count on a node (O).

## 9. Monetisation touchpoints (O)
Persistent 0 %-credits toast on every canvas; auto upgrade modal on entering a flow; in-node "Need a refill?" card; locks on Edit, batch 2X/4X, most t1 models, Unlimited Mode. Plans: Starter 300 cr./mo (≈4 Nano Banana Pro), Pro $17.91, Ultimate $44.91 (+Unlimited Pack), Infinite $399.92; per-model "Free Gens" quotas. `evidence/billing.upgrade-modal.webp`.

## Coverage
Surfaces (10): home · canvas-welcome · canvas-new · canvas-quant · library · gallery · knowledge-market · knowledge-garden · settings · billing. States: 43 fingerprinted (65 evidence captures); ~150 browser actions. Core loop observed end-to-end except a *successful* run (0 credits). Not covered: Slides/Website output surfaces, Apps/template "Use" flows, Projects, Composer object, Upscale options, node drag/edge editing, Organize Nodes, multi-select, oracle tab, Usage/Account settings content.

Side effects left on the account: one new flow "PARA research scratch" (2 nodes, no credit spent) and one Follow-Up draft node in the tutorial flow (owner may delete both).
