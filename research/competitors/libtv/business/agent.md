# Agent role

- **O** "LibTV Agent" is present on tv-home (composer), `/skill` (marketplace + composer) and inside the canvas as a right-docked drawer bound to the project. Composer affordances: 添加附件 (本地上传 / 素材库添加; accepts image/video/audio/pdf/txt/md/doc), 选择模型 (inserts model chip), Skill (inserts skill chip), 生成模式 menu, `@` references to 工作流/节点/资源, Send.
- **O** Skills are community recipes with declared inputs/outputs (e.g. 东方巨构美学短剧: input 一份剧本或一句话 + optional 人脸/造型参考图; output 角色/道具/场景资产图、逐镜分镜表格、仙侠短剧视频成片). Tagline: 从 Skill 出发，抵达成片.
- **O** Autonomy control in Agent 设置 → 协作模式: `自动生成图片/视频 — 开启后，Agent 可直接消耗积分，提交图片/视频生成，无需逐次确认` (default implies per-step confirmation) and `积分预算管理` with 提醒阈值 (1000). Free tier: 非会员每天免费对话 3 轮. Portrait safety agreement gate for Seedance 2.0 with real faces.
- **O** Canvas ↔ Agent coupling: adding a node inserts a locatable chip (`点击定位到画布节点`) into the composer; the read-only community viewer shows agent-generated storyboard text nodes (h3 sections such as 📋 15秒详细分镜表 (Storyboard)).
- **I2** The Agent's output is nodes on the canvas (asset images, 分镜 text cards, video nodes) — the published graphs (资产 → 分镜 → 视频 groups) match Skill output declarations.
- **U** Planning/approval UI during a run, CLI & Skill panel contents, 生成模式 options.
