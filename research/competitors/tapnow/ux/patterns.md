# TapNow UX patterns (O unless marked)

1. **Node = generator + artefact.** Every generative node carries prompt, model, params, count, cost and Generate; the output renders in the same node and the bar remains for regeneration. Edits (Change Angle, Relight, Redraw) also happen *inside* the node. Evidence: `canvas.node.image.generated.webp`, `canvas.node.image.tool-redraw.webp`.
2. **Selection drives disclosure.** Nothing node-specific is visible until a node is selected: then floating toolbar (type-specific), title input, generation bar, Reference handle. Deselect → all gone. Evidence: `canvas.node.text-selected.webp`.
3. **Selection feeds the agent.** Selecting a node inserts a context chip (thumbnail) in the agent composer; the agent's replies reference nodes with mention chips. Evidence: `canvas.node.image.tool-change-angle.webp`, `canvas.agent.generated.webp`.
4. **Two-level autonomy switch** on the composer (Ask before acting / Act without asking) with a fully-specified approval card (cost, model, params) before spend. Evidence: `canvas.agent.confirm-mode.webp`, `canvas.agent.approval.webp`.
5. **Transparent agent log** ("Completed N actions" collapsible: read skill, run command, describe model, submit task). Matches manifesto "Transparent. Traceable. Replicable." Evidence: `canvas.agent.actions-expanded.webp`.
6. **Cost is always adjacent to the trigger** (per-node Tapies, `~5 Tapies` in agent card, Redraw cost 15). No confirmation dialog for manual generation. Evidence: `canvas.node.image.prompt-filled.webp`.
7. **Command-palette node creation** (cmdk: Text/Image/Video/Audio/3D + Utilities + Upload) from dock ⊕ and pane right-click. Evidence: `canvas.dock.add-node.webp`.
8. **Left dock = drawers** (Library, History) that *replace* the dock rail while open, with "Back". Evidence: `canvas.library.private.webp`, `canvas.dock.history.webp`.
9. **Fullscreen tool overlay** for the raster Image Editor, entered from a node, with its own generation composer; returns via "Save and Back To Canvas". Evidence: `canvas.overview.webp` (editor DOM in raw).
10. **Skills/templates are clonable graphs**, not wizards: one click creates "<name> (copy)" project and opens it. Evidence: `app.skill-card.canvas.webp`.
11. **Prompt-first home**: the app home is an agent composer above projects/skills. Evidence: `app.home.webp`.
12. **Model catalogue as a first-class picker** with resolution/duration/cost/speed tags and NEW/HOT/discount badges, per media type (~22 image, ~50 video, 13 LLM, 6 audio). Evidence: `canvas.node.video.model-menu.webp`.
13. **Memory and Skills as agent nouns** (suggestion cards "build creative memory", "Create a custom Skill from my preferences"). Evidence: `canvas.default.webp`.
14. **History = outputs, not versions.** No document version/branch UI found; Undo/Redo only (U). Evidence: `canvas.dock.history.with-item.webp`.
15. **Gamified community** (Arena hackathons, Tapies rewards, Publish to TapTV, Earn Tapies). Evidence: `app.arena.webp`.
