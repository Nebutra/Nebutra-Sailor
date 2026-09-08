# Agent — Lovart

**Where it lives** (O): a persistent right panel on the canvas (≈38% width), collapsible to a 对话 button; the same composer component is the hero of the home page. Header: 新建对话 · 历史对话 (searchable per-project list) · share · collapse.

**Composer** (O): textbox with mention chips (selected shapes auto-inserted; 发送至对话 from context menu), + (上传文件 / 联网搜索), Skill book (19 skills / 6 categories), mode switch Agent / 图像 / 视频, thinking-mode bulb, 模型偏好 cube, mic when empty / send, drag-drop hint "将文件拖拽至此处添加到对话". Empty canvas hint: 按 C 开始对话 (chat mode on canvas, O; behaviour U).

**Role** (O): planner-executor ("agentName: CreationPlanner" on results). For a one-image request it went 思考中 → tool step "GPT Image 2 · 生成中" → result card → summary text. No plan preview, no approval gate, no retry control observed (U for failures). Feedback: 点赞 / 点踩 per response.

**Blocking** (O): the canvas is not blocked while the agent runs; a stop button replaces send.

**Output landing** (O): placeholder shape appears immediately at the target spot, swapped in place with the result; result linked to the thread/action via shape meta; result also rendered as a card inside the thread.

**Skills** (O): named recipes such as Logo 设计, 一键跨平台适配, 分镜故事板, 室内设计 — described as multi-output workflows (e.g. "一键生成 8 张…").

**Scope of context** (I2): per project — threads are listed per project, and the brand kit is attached per project; whether the agent reads the brand kit was not observable (empty kit).
