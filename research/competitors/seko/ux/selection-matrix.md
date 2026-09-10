# Seko — selection semantics

| Entity selected | Where feedback appears | What appears | # actions | Primary |
|---|---|---|---|---|
| Nothing (empty canvas) | canvas centre | hero 开启全新创作之旅 + 4 quick-start chips; agent suggestions | 4 chips + rail | + / double-click |
| Blank node | under node + above node | generator inspector (4 mode tabs; 上传/选择; prompt; model; ratio·res; @; 1张; ✦cost; send) and a floating 上传 pill | ~10 | send |
| Image node (completed) | above node (toolbar), under node (inspector), URL (`&nodeId`), agent composer (attachment chip) | 9 named ops + ··· (5) + 合成视频 + download + 1 more; inspector defaults to 图片生成 with the node's prompt; left/right `+` handles on the node | ~17 | none highlighted; send in inspector |
| Image node → 视频生成 tab | under node | 首帧/尾帧 slots, prompt carried, video model, res·duration, ✦10 | 6 | send |
| Derived node (多角度) | same as image node | same toolbar (O, not re-verified for every op) | — | — |
| Edge | — | React Flow a11y: selectable, delete/escape | 1 | delete |
| My-space card | none in a11y tree on hover | title + timestamp only | 0 observed | open |
| Skill card | none | like button only | 1 | (U) |

Selection is single-entity by default; marquee multi-select and grouping exist per the shortcuts panel (O, not exercised).
