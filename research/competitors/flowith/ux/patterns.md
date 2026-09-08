# Flowith UX patterns (tiered)

1. **One composer, many modes (O).** Chat / Image / Video / Slides / Website / Neo Agent are chips that re-skin a single composer in place; each mode owns its default model and footer controls (ratio, size, keyframes, MAX). Last mode and per-mode model are remembered client-side. `evidence/home.mode-image.webp`, `home.mode-neo-agent.webp`.
2. **Selection is quotation (O).** Clicking a node inserts it into the composer as a removable token; several nodes accumulate; the next generation is "about" those nodes. Settings: *Node Interaction Mode: Quote first*. `evidence/canvas.welcome.answer-node-selected.webp`.
3. **Type-specific contextual toolbar (O).** Toolbar content depends on node kind (prompt vs answer vs image vs step); professional image tools (Crop, Upscale, Background Removal, Vary) live on the node, not in a separate editor. `evidence/canvas.welcome.image-node-selected.webp`.
4. **Follow Up = branch with lineage (O).** Highlights ancestors, creates a draft prompt node, pre-fills a "Follow-up with N nodes" token and the matching mode. `evidence/canvas.welcome.follow-up.webp`.
5. **Node-anchored mini forms (O).** Vary opens a small form (batch, ratio, model shortlist, cost sentence, Run) next to the node; same vocabulary as the home composer. `evidence/canvas.welcome.image-vary-menu.webp`.
6. **Job = node (O).** Send creates prompt + answer nodes at once; the answer node is the job container and its terminal state (content or failure card) is persisted in place. `evidence/canvas.new.sent-t8.webp`.
7. **Agent plan projected as nodes (O).** Step-label bars, Groups for parallel work, output docs and a sandbox node — no plan panel. `evidence/canvas.quant.overview.webp`.
8. **Everything reachable from the canvas (O).** Flow switcher in the title, Media History drawer and Knowledge Garden modal in the dock, Share/Comment in the title bar, Search Node modal with per-type counts and Export.
9. **Colour tags as the only manual metadata (O).** Five colour dots on every toolbar; no naming/renaming of nodes seen.
10. **Monetisation woven into the surface (O).** Locks on Edit / batch / models / Unlimited Mode, persistent 0%-credit toast, auto upgrade modal, in-node "Need a refill?" card.
11. **Keyboard-first navigation for tall flows (O).** ⌘0/⌘1 zoom, ↑↑/↓↓ jump to top/bottom, E "Read Closer", F Follow Up, Enter send.
12. **Sidebar collapses on entering a flow (O)** — canvas ≈ 88 % of viewport, ≈ 95 % minimized.
