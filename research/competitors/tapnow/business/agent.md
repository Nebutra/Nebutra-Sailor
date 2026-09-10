# TapNow agent (tier per line)

**Framing (O, marketing/manifesto):** "create with AI Agents… orchestrate text, image, audio, and video models"; "Your AI Executive Director — zero manual context feeding, 100 % proactive creation; you set the vision, the agent executes: driving the script, predicting the next scene, enforcing shot-by-shot consistency"; manifesto rejects black boxes: "Transparent. Traceable. Replicable."

**Entry (O):** (1) app home composer ("What are we making today?") — creates/opens a project (I2, not exercised); (2) right panel on every canvas, project-scoped chat sessions (New chat / Chat history / Fork conversation); (3) suggestion cards (New / Memory / "Create a custom Skill from my preferences").

**Blocking (O):** the panel stays interactive while the agent runs (composer visible, timer ticking); whether canvas editing is allowed concurrently: U (not attempted). One agent session per chat; concurrent sessions U.

**Plan display (O):** collapsible "Completed N actions" log with named steps (Read TapNow canvas operation Skill · Read generation.md · Ran 1 command · Check available models · Describe <model> · Get node details · Looked at 1 item · Submit generation task). No separate multi-step plan/todo view was observed for this single-action task (U for larger tasks; "Side panel" toggle content not captured).

**Approval (O):** composer switch `Ask before acting` (pause for approval on each action) vs `Act without asking`. Approval card = action type + `~cost` + rewritten prompt + reference chips + model + ratio + resolution + count + mode label "Act", buttons Cancel / Confirm; params rendered as buttons (I2 editable before confirm).

**Execution (O):** after Confirm the agent mutates the graph (new node "Generate Image" + edge from the reference node) and submits an async task; status "Thinking..." → "Processing... · Ns" → "Editing 1 file" → final message with node mention chips; total "Worked for 2m25s".

**Model (O):** per-session LLM choice (Auto → Gemini 3.7 Flash on FREE; Sonnet 5 / GPT 5.6 / GPT 6 / Opus 5 / Fable 5 / Kimi gated by plan); locked once the session starts.

**Skills & memory (O labels / I2 mechanics):** agent reads a "canvas operation Skill" and `generation.md` → skills are documents + commands the agent loads; user-facing Skills are clonable graphs and "Reusable personal Skills" (pricing); Memory cards promise per-project memory (theme, style, relationships, limits). "Use apps to extend Agent capabilities" → plugin/app extension point (O label; content U).

**Credits (O):** separate "Agent Tapies" pool (Usage Dashboard: Total vs Agent usage; "Subscribe to unlock Agent Tapies"); gifted trial Tapies.

**Not observable this pass (U):** Act-without-asking behaviour, multi-node plans, failures/retries, agent editing existing nodes, comment-mode collaboration.
