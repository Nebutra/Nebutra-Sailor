# Progressive disclosure matrix

| Control | LibTV canvas video node | liblib.art image generator | liblib.art video generator | /sd WebUI |
|---|---|---|---|---|
| Prompt | tier 1 (on node, @ refs) | tier 1 textarea | tier 1 (@ refs) | tier 1 |
| Model | tier 1 chip `2.0` + Agent 选择模型 popover | tier 1 chip → 选择模型 modal with capability badges | tier 1 chip `Seedance 2.0 VIP` | tier 1 dropdown (checkpoint file) + VAE |
| Mode (全能参考 / 首帧…) | tier 1 chip | — | tier 1 chip `全能参考` | tabs 文生图/图生图/… |
| Reference images / video / audio | tier 1 chips 参考/标记 + thumbnails | attach 图片 | attach 视频/图片/音频 | img2img tab |
| Ratio / resolution / duration / audio / count | tier 2 popover (Auto..21:9; 480P..4K; 4–15 s; 生成音频; 1/2/4) | tier 2 popover (质量 低/标准/高; 1K/2K/4K; 13 ratios; 1–4 VIP) | tier 2 popover (智能+6; 480P/720P/1080P; 4–15 s; 同时生成声音) | tier 1 sliders (Width/Height 128–1536, Steps 1–60, CFG) |
| Style / LoRA / effect | tier 1 chips 特效 (modal 特效广场), 角色库 (modal), 运镜 | 风格模型 popover (community LoRA cards) | — | 模型 side tab, Clip Skip, sampler list |
| Advanced | tier 3 `高级设置`: 联网搜索, 自动校验素材, 智能引用 AutoLink | none | none | everything (面部修复, 高分辨率修复, Inpaint Anything, tagger) |
| Batch / count | 生成数量 1/2/4 (tier 2) | 图片张数 1–4 (VIP) | — | Number of images |

Tier legend: 1 = always visible · 2 = one click (popover/modal) · 3 = labelled advanced group. All O.
