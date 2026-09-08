# seko.my-space — 我的空间

Route `/my-space?tab=story|canvas|avatar`. The account's work list, split by object type: **故事** (searched by 策划案 name, filtered by genre), **画布**, **数字人** (O). Tab state lives in the URL (O).
A canvas opened via `/infinite-canvas` appears immediately under 画布 with the title 未命名故事 and a timestamp; it does NOT appear under 故事 (O) — canvas and story are separate top-level objects sharing a shell.
No create action here; creation starts from `/explore` (O). Card hover showed no extra actions in the accessibility tree (O; rename/delete affordances U).
Evidence: `evidence/myspace.list.webp`, `evidence/myspace.canvas-tab.webp`, `evidence/myspace.canvas-tab-populated.webp`, `evidence/myspace.avatar-tab.webp`.
