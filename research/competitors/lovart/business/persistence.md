# Persistence boundary — Lovart

| Thing | Persists? | Where (tier) |
|---|---|---|
| Project (title, shapes, threads) | yes | server; visible on /zh/projects with 更新于 and cover mosaic (O) |
| Canvas camera / zoom | yes | restored on reload (O); client-side (I2) |
| Selection + quick-edit mode | yes | restored on reload (O) |
| Open popovers (brand kit, font generator), collapsed panel | yes | restored on reload (O); localStorage (I1) |
| Conversation threads | yes | 历史对话 per project with search (O) |
| Generated files | yes | 生成文件 drawer per project (O) |
| Canvas snapshots (画布历史) | yes | browser-local (I2: `local-history-close-button`, tagged by 打开/保存 events) |
| Model preference / 自动 toggle | yes within session | unverified across projects (U) |
| Brand kit | yes | account-level library, attached per project (O) |
| Project ordering on /zh/projects | not by updatedAt | new project appears second, older order unchanged (O) |
| Fonts from 字体生成器 | "My Fonts" tab exists | (U) |

Two ids coexist: legacy projectId 32-hex, new 12-char (O). Canvas route has no locale prefix (O). Project cards open in a new tab (O).
