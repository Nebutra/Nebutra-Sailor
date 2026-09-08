# Selection semantics

| Context | Single click | Double click | Right click | Hover | Multi | Tier |
|---|---|---|---|---|---|---|
| Canvas pane | (no observable change) | opens 添加节点 popover at cursor | — | — | U | O |
| Node (video/image) | no DOM change; node toolbars always rendered | U | context menu: 优化工作流布局 / 复制节点 ⌘C / 创建副本 ⌘D / 粘贴 ⌘V / 删除 ⌘⌫ / 复制到剪贴板 | tooltip on chips (新功能：支持真人) | U (React Flow default marquee likely, I1) | O / I2 |
| Node `+` side handles | (present left/right of node) | — | — | — | — | O (not clicked) |
| 生成历史 items | (none present) | — | — | — | 批量操作 button exists → multi-select on history | O |
| 资产管理 node list | list rows; 搜索/筛选/所有评级 | — | — | — | U | O |
| 角色库 thumbnails | selects archetype → detail sheet above; 应用至画布 | — | — | — | single | O |
| TV Show card | hover reveals 查看创作过程; click opens read-only viewer | — | — | 查看创作过程 | — | O |
| Read-only viewer | 只读模式 — no editing; 复制项目 | — | — | — | — | O |

Result selection on generated variants (生成数量 2/4) could not be observed (no generation run) — U.
