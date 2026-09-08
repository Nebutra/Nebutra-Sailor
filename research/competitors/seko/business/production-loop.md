# Seko — production loop (2026-09-08)

**Core unit of work (O):** a *Canvas* of *Nodes*. Each node is one generation slot (text / image / video / audio) that is configured, submitted and displays its own result. Derived operations spawn child nodes linked by edges, so a scene grows rightwards as a provenance graph (O: 图片 → 多角度).

**Two front doors (O):**
1. `/explore` hero **短片工作室** — prompt (+ script upload pdf/docx/txt, genre chip, Seedance2.5 全能模式, 多剧集 switch) → "AI 会为你自动策划内容生成视频". This is the story pipeline whose outputs list under my-space **故事** (策划案). Not exercised (would start video generation) — internal states **U**.
2. `/explore` hero **创作 Agent (无限画布)** / 空白画布 card → the canvas with agent aside.

**Loop on the canvas (O):** add node → configure (model, ratio/res, @subject, count) → submit (✦ debited) → wait in-node → derive (多角度 / 故事推演 / 图片超清 / 画面切分 / 打光 / 对口型 / 消除笔 / 全景 / 九宫格 / crop-annotate-flip-inpaint-add) → switch node to 视频生成 (首帧/尾帧) → 合成视频 → composition node or 编辑器 → 发布作品.

**Reusable identity (O):** 主体 (subject) — account-level, image + optional voice, category 角色/场景, referenced with `@` (model-dependent capacity 3–14 refs).

**Skills (O):** packaged workflows in 技能社区, invoked from the agent composer; the top one (山音编剧大师2.0) is a script-generation skill (26k uses), showing that scriptwriting is the entry of the story loop.

**Review / versioning:** no compare, approve, or version UI observed on the canvas (O-negative). History is the graph itself plus 生成历史 (assets kept even if nodes deleted) (O). Undo/redo exists (shortcuts) (O).
