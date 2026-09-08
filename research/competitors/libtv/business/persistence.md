# Persistence boundary

- **O** Project/canvas state is server-persisted with an explicit sync indicator (`待同步` / `同步中` / `已同步`) in the top bar; nodes created from a template survived a hard reload (2 nodes before and after).
- **O** Project identity lives in the URL (`spaceId`, `projectId`); template launches rewrite the URL to the newly created project. `sourceSpaceId`/`sourceProjectUuid` are consumed once.
- **O** Generation history is persisted per canvas (`本画布`) and per project (`全部画布`) with member attribution (`按成员筛选`) — a team-scoped store.
- **O** Libraries are scoped: 角色库 (platform presets), 素材库 / 工具箱 (团队 / 我的), Skills (公共 / 收藏 / 团队), liblib.art `/asset` (团队中心 / 个人资产, 3GB on free tier per login promo).
- **O** Agent conversations persist per project (`历史对话`, `新对话无法分享` until started).
- **O** Auth and credits are shared across `liblib.art` and `liblib.tv` through an iframe `cross-storage-hub.html` on each origin; the home header may render `注册/登录` before the bridge hydrates.
- **O** Published projects are frozen as read-only copies (`只读模式`); `复制项目` creates an independent project — no live link/versioning between original and copy observed.
- **U** Local/offline state, undo history across reloads, and canvas versioning were not observed.
