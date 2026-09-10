# TapNow persistence boundaries (tier per line)

- **Project** is the durable container (O): listed in Workspace with "Edited N ago"; route `/canvas/<uuid>`; rename/move/share/delete at project level. Team vs Private scope is a project property ("Move to team").
- **Canvas** persists inside a project (O): header switcher lists canvases + "New Canvas"; canvas rename in header.
- **Node state persists server-side** (O): after a full page reload the image node was still in Redraw mode with mask tooling and the generated image present; nodes I added (Video, Audio, Image Editor, agent "Generate Image") survived reload.
- **Generated artefacts** live in object storage (O): `https://files.tapnow.media/api/conversation/storage/uploads/<uuid>` (also `files.tapnow.art` on www) and are indexed in the per-project History drawer by media type and date.
- **Agent chats persist per project** (O): Chat history lists sessions with relative time; model locked per session; Fork conversation.
- **Library** persists per user (Private) and per team (Team) (O labels); "Save to Library" from nodes.
- **Memory** — suggestion cards reference "creative memory for this project" and "carry forward this project's memory" (O labels); storage/shape U.
- **Local files** — desktop app "connects to your local creative files" (O marketing copy); not observed in the web app (U).
- **Version history** — none observed; only Undo/Redo shortcuts (O). Whether node regeneration keeps prior outputs beyond the History drawer: History showed dated entries, so outputs are retained even if the node shows only the latest (I2).
- **Credits** are account/team-level (O): balance in header and user menu; "Member Tapies controls" for teams.
