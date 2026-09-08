# TapNow — competitor synthesis (explored 2026-09-08)

Entry https://www.tapnow.ai ("Your Creative OS") → app https://app.tapnow.ai (title "Your Agentic Creative Canvas", v2.15.9, Tamar AI Inc.). The owner's Chrome session was already logged in (FREE plan, ~200 gifted Tapies), so **both public and authenticated tracks were explored** without entering credentials. Two cheapest image generations were spent (5 + ~5 Tapies); nothing deleted, published or shared. Evidence: `evidence/*.webp` (53 files); raw DOM/text dumps in `raw/`.

## 1. Core unit of work — **Node** inside a **Canvas** inside a **Project** (O)
- Manifesto states the ontology outright: *Node = Vocabulary, Wire = Logic, Group = Phrase (reusable Chapters), Canvas = Universe* (`www.manifesto.webp`).
- A Project (`/canvas/<uuid>`) holds many canvases (header switcher + "New Canvas") (`surfaces/canvas`). Workspace lists projects in Private | Team scopes with Collections (`app.workspace.private.webp`).
- Every generative node is **generator + artefact**: prompt (TipTap), model select, params, 1×–4×, Generate, inline Tapies cost; the output renders inside the same node and the bar remains for regeneration (`canvas.node.image.generated.webp`). Node kinds: Text, Image, Video, Audio, 3D, plus Image Editor / Timeline Editor (Beta) / 3D Studio utilities and Upload; search filters also list World and Group.

## 2. Persistence boundary (O)
- Project → Canvas → Node all server-persisted; a full reload restored added nodes and even the image node's in-progress **Redraw mode** (`canvas.node.image.tool-redraw.webp`).
- Outputs live at `files.tapnow.media/api/conversation/storage/uploads/<uuid>` and are indexed per project in the **History drawer** (Image/Video/Audio/3D, dated, Select → Apply to Canvas / Download) (`canvas.dock.history.with-item.webp`).
- Agent chats persist per project (Chat history, auto-titled, Fork). Library assets persist Private | Team. Desktop app adds local-file context (marketing, O copy). See `business/persistence.md`.

## 3. Reusable identity (O / I2)
- **Library drawer**: Private | Team, Favorite, categories Folder / Character / Scene / Item / Style / Sound Effect / Others; "Save to Library" on nodes (`canvas.library.private.webp`).
- **Elements → Subject**: "Pack images, text, audio, and video into a unified Subject for one-click use in video nodes — exclusive to Seedance 2 / 2.5"; skill "Omnimodal Subject: up to 50 references".
- **AI Character Library**: preset catalogue with era tabs and facets (gender, age, species, build, hair, temperament) (`canvas.library.ai-character.webp`).
- **Skills** = clonable project graphs (one click created "Video Edit (copy)" and opened it) and agent-loaded documents; plans sell "Pro Skills" and "Reusable personal Skills" (`app.skill-card.canvas.webp`, `app.pricing.webp`).
- Scope: user (Private), team (Team), platform (AI Characters, TapTV templates).

## 4. Generation result object (O)
An output bound to its requesting node, with prompt/model/params retained; duplicated into History; Reference handle + edges route it into other nodes (agent-created node arrived with an edge from the reference image). Costs per node: image 5 (Seedream 5.0 Lite 2K), video 30 (Seedance 2.0 Mini 480p 5 s), audio 10, Redraw 15 (Banana Pro). Manual lifecycle: prompt → Generate (no confirm) → ~39 s → result; no textual progress state in DOM (U spinner). Catalogue: ≈22 image, ≈50 video, 13 LLM, 6 audio models with resolution/duration/latency/cost tags (`canvas.node.video.model-menu.webp`). Details `business/generation.md`, `business/jobs.md`.

## 5. Agent role (O) — "AI Executive Director" = tool-using operator of the canvas
- Right panel on every canvas + prompt-first app home. Composer: `+`, **Ask before acting / Act without asking**, LLM picker (FREE = Gemini 3.7 Flash; Sonnet 5, GPT 5.6/6, Opus 5, Fable 5, Kimi gated), mic, Send; selected nodes become context chips (`canvas.agent.confirm-mode.webp`, `canvas.node.image.tool-change-angle.webp`).
- Text task: "Worked for 1s", markdown, Copy / Good / Bad / Fork (`canvas.agent.done.webp`).
- Paid task in Ask mode: "Completed 7 actions" (log: *Read TapNow canvas operation Skill · Read generation.md · Check available models · Describe nano-banana-2-lite / seedream-5-lite · Get node details · Submit generation task*) → **approval card** `Image Generation · ~5 Tapies · prompt · ref chip · Nano Banana 2 Lite · 1:1 · 1K · 1× · [Cancel] [Confirm]` (`canvas.agent.approval.webp`, `canvas.agent.actions-expanded.webp`).
- Confirm → new node + edge on canvas → "Processing… · Ns" (~60 s) → "Editing 1 file" → reply with node mention chips, "Worked for 2m25s" (`canvas.agent.generated.webp`).
- Separate **Agent Tapies** pool (Usage Dashboard: Total vs Agent). Memory ("build creative memory for this project — theme, style, relationships, limits") and "Use apps to extend Agent capabilities" are first-class labels; mechanics U. See `business/agent.md`.

## 6. Canvas role (O)
The canvas is the single shared state between human and agent: humans add/edit nodes directly; the agent adds nodes and edges and submits tasks into them. Chrome ≈ 42 % with the agent panel open (33 % panel, dock rail, header, bottom controls); primary buttons visible at rest: Send only — Generate appears on node selection (`ux/density.yaml`, `ux/disclosure-matrix.md`). Comment mode exists (not exercised). No version/branch history — Undo/Redo only (U).

## 7. Professional tool entry (O)
- **Inline in node**: Change Angle (cube, rotation/tilt/scale, wide-angle), Relight (key/global/colour temperature/rim), Redraw (mask + prompt + own model/cost), Crop, Point to Edit, First/Last Frame, Omni Reference, Generate Audio toggle (`canvas.node.image.tool-change-angle.webp`, `…relight.webp`, `…redraw.webp`, `canvas.node.video.params-menu.webp`).
- **Fullscreen overlay**: Image Editor node → raster editor (layers, shapes, text, upload, own generation composer, "Save and Back To Canvas") (raw DOM; screenshot blank in background tab).
- **Elsewhere/U**: Timeline Editor (Beta) and 3D Studio did not open in-tab.
- Marketing "Lens Combo" (camera/lens/focal/aperture) not found in the web canvas this pass (U).

## 8. Review / versioning (O / U)
Review = Good/Bad on agent replies, Fork conversation, approval gate on paid actions, comment mode toggle. Versioning = History drawer of outputs (not documents) + Undo/Redo; no snapshots/branches found (U). Sharing = Share by link (viewable + copyable template), Publish to TapTV, Move to team.

## Framing of "Creative OS" / "Agents orchestrate models" (O)
Marketing: OS = one canvas where an agent orchestrates text/image/audio/video models with "zero friction"; manifesto: node/wire/group/canvas grammar, "Precise Control with Ease", anti-black-box, community fork/remix. Product reality matches: a model marketplace (Tapies, Model Mart, per-model promos) fronted by a node canvas, with a transparent, approval-gated agent that reads skills and issues canvas commands. Pricing sells concurrency (4 tasks), queue priority, images/seconds quotas, team seats (100), Skills.

## Surfaces explored (34 states, 7 surfaces)
`www-home` (hero + live RF demo), `www-pages` (manifesto, download, enterprise), `app-home` (composer, LLM menu, skills, templates, user menu), `workspace` (Private/Team, card menu), `canvas` (16 states: palette, search, library, AI characters, history, text/image/video/audio nodes, three in-node tools, share, settings, image editor), `agent` (6 states incl. approval + run), `peripheral` (Arena, Pricing). Marketing sections beyond hero are I1 only.

## Not explored / still needs the authenticated track
- Timeline Editor (Beta), 3D Studio, "Side panel" content, comment threads, team collaboration, Model Mart / Buy Credit flows, Act-without-asking runs, multi-step agent plans, failure/retry/cancel states, video/audio/3D generation end-to-end, Group nodes, Lens Combo, Publish to TapTV / TapTV community pages (Community opened outside the session tab), desktop app local-file context.
- Method caveats: background-tab screenshots miss animation-gated paint (several canvas states are evidenced by DOM/text dumps in `raw/` more than pixels); the project list rarely loaded in a background tab (direct `/canvas/<uuid>` used).
