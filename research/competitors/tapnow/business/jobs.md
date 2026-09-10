# TapNow job lifecycle (tier per line)

**Manual node job (O, 1 run — Seedream 5.0 Lite, 1:1, 2K, cost 5):**
`idle` → Generate enabled once prompt non-empty → click → no confirmation, no modal → (no textual status in DOM for ~39 s; U whether a spinner/progress overlay renders) → output image in node, toolbar switches to edit tools, History drawer entry dated 2026-09-08. Header balance did not refresh immediately (still 200; user menu later showed 170 after two jobs).

**Agent job (O, 1 run — Nano Banana 2 Lite, 1:1, 1K, ~5 Tapies):**
`awaiting-approval` (card) → Confirm → card "Confirmed" → panel "Thinking..." → canvas node "Generate Image" created (placeholder) + edge → "Completed 8 actions" → "Processing... · 8s / 12s / … 53s" live timer → "Editing 1 file" → done (~2 m 25 s wall, incl. planning). The agent's log names the step "Submit generation task" — an async task handle (I2).

**Concurrency:** plans advertise "4 concurrent tasks" (BASIC) and "Standard queue" (O pricing copy) → server-side queue with per-plan concurrency (I2). Not exercised.

**Cancel / retry / failure:** not observed (U). Approval card has Cancel before submission (O).

**Where job state is shown:** in the node (result), in the agent card (status + timer), in History drawer (finished outputs). No global jobs list/queue panel found on the canvas (U; the "Side panel" toggle was probed but its content was not captured).

**Cost accounting:** per-job cost shown before submission (node bar, agent card); Usage Dashboard splits Total vs Agent usage, with "Agent Tapies" as a separate gifted/plan pool (O).
