# tapnow.agent — right-panel agent (project-scoped chat)

Tier O unless marked. Header: Side panel, **New chat ▾**, Usage (opens Settings → Usage Dashboard "Total Usage | Agent Usage"), **Chat history** (sessions list, "Add new chat"), Collapse chat. Idle body: "Hi <name>! What are we making today?" + suggestion cards (**New** "Create a sound-rich H3 short" / **Memory** "Help me build creative memory for this project — Record the theme, style, relationships, and limits"; on a cloned skill project: "Help me carry forward this project's memory", "Create a custom Skill from my preferences"). Composer: `+`, hand icon, **Ask/Act switch**, `Auto` LLM, mic, Send; footer "Use apps to extend Agent capabilities."

## Autonomy
`Ask before acting` — "TapNow pauses so you can approve each action" · `Act without asking` — "TapNow works without asking for approval". LLM locked per session ("Start a new chat to use a different model").

## Observed runs
1. Text-only storyboard request → "Worked for 1s", markdown reply, chat auto-titled "Ceramic Teacup Ad"; actions Copy / Good / Bad / **Fork conversation**. No canvas change.
2. "Generate exactly one image…" (Ask mode) → **"Completed 7 actions"** (collapsible log) → **approval card**: `Image Generation · ~5 Tapies · <rewritten prompt> · [Image ref chip] · Nano Banana 2 Lite · 1:1 · 1K · 1× · Act` with **Cancel / Confirm**. Confirm → "Confirmed" → "Thinking..." → "Completed 8 actions" → **new node "Generate Image" appears on canvas with an edge from the reference image node** → "Processing... · Ns" (~60 s) → "Editing 1 file" → final message with node mention chip; "Worked for 2m25s".
   Action log: *Read TapNow canvas operation Skill · Read generation.md · Ran 1 command · Check available models · Describe nano-banana-2-lite model · Describe seedream-5-lite model · Get node details · Looked at 1 item · Submit generation task · Generate Image.*

## Reading (I2)
The agent is a tool-using LLM with skill documents and CLI-style commands over the canvas graph; it plans (model discovery + node inspection), proposes a fully-specified paid action with a cost estimate, and after approval mutates the graph (node + edge) and submits an async generation task whose result lands in that node. Canvas nodes are the shared state between human and agent. Not observed (U): concurrent editing while running, multi-step plan display before the first paid action, retries.

Evidence: `canvas.agent.confirm-mode.webp`, `canvas.agent.done.webp`, `canvas.agent.approval.webp`, `canvas.agent.actions-expanded.webp`, `canvas.agent.generated.webp`, `canvas.agent.chat-history.webp`, `canvas.agent.apps.webp`.
