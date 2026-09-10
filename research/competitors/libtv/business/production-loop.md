# Production loop — LibLib / LibTV

**Core unit of work (O):** a LibTV *项目* (workspace) holding one or more *画布* node graphs. Everything a user makes — assets, shots, motion clips, storyboard text, edits — is a node on a canvas. liblib.art has no project object; its unit is a single generation form (`/ai-tool/*`) or a WebUI session.

**Loop as observed (O):**
1. Enter from LibTV home: `新建项目` (blank), `新建画布创作`, or a template launcher (导演台 / 逐帧拉片 / 片段重拍 / model cards) which clones a source project into a fresh `spaceId+projectId`.
2. Populate: `添加节点` (文本/图片/视频/智能剪辑/导演台/逐帧拉片/音频/脚本/素材库) or `添加资源` (上传 / 从生成历史选择), or empty-state templates (故事脚本生成, 角色三视图, 全能参考生视频, 音频生视频), or ask the Agent (Skill-driven).
3. Configure on the node (prompt with @refs, model, mode, config chip, chips 参考/标记/特效/角色库/运镜, 高级设置) and press ▶.
4. Results land in the same node and in `生成历史` (per canvas / per project) with a rating filter; 智能剪辑 nodes consume upstream video nodes.
5. Review in `故事板` view (type columns) — no timeline/NLE observed (U for 智能剪辑 output).
6. `发布与分享`: publish work + process to TV Show, or share a copyable link. Community members `查看创作过程` → `复制项目`.

**liblib.art loop (O):** browse feed (模型 / 视频特效 / 发现灵感 / 工作流) → model page (`去WebUI使用`, 推荐参数) or image page (`做同款` → generator prefilled via `?fillimgid`) → generate → `/asset`. LoRA training at `/pretrain` feeds back models into the feed (I2).

**Professional tool entry (O):** not a page/modal/tab/mode — a *template project* cloned into the canvas, plus node types (导演台 n-node with `打开导演台`; 逐帧拉片 = groups → shot i-nodes → motion v-nodes → BGM a-node). The 3D 导演台 editor itself could not be opened (U).
