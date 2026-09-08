# lovart.home — 首页

- **Role** (O): prompt-first launcher. Hero is the agent composer; below it 最近项目 (recent projects) and 灵感发现 (inspiration grid, 9 category filters).
- **Composer** (O): textbox + `+` (上传文件 / 联网搜索) + Skill book (19 skills / 6 categories) + thinking bulb + 模型偏好 cube (22 image / 20 video / 1 3D models, ETA badge, 会员专属 tags) + send. Identical component reused inside the canvas panel.
- **Chips** (O): GPT Image 2 · Seedance 2.0 · Nano Banana Pro (model names) · Design · Branding · E-Commerce · Video (prompt-preset categories; clicking rewrites suggested prompts).
- **Project card → canvas** (O): `window.open('/canvas?projectId=<hex>')`, a new tab; canvas route is locale-less.
- **Credits** (O): ⚡70 next to 升级. Left rail: 新建项目 / 首页 / 项目 / 品牌套件 / ?.
- Evidence: `evidence/home.webp`, `home.plus-popover.webp`, `home.book-popover.webp`, `home.settings-popover.webp`; text dumps in `raw/home.skill-popover.txt`, `raw/home.model-popover.txt`.
- Not entered: 立即升级 / 升级 paywall, 试用 Lovart 新版本 (U).
