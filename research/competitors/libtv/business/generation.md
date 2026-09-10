# Generation model

- **O** Model catalogue on LibTV (Agent 选择模型): image — Lib Image, General image Pro, General image V2, Seedream 5.0 Pro, Style Image V8.2/V8.1/V7; video — Seedance 2.5, Seedance 2.0 VIP, Minimax H3, Seedance 2.0 Fast VIP, Wan 3.0 Prime, Wan 3.0, Kling O3, Kling 3.0. Node model chip showed `2.0` (Seedance) with mode `全能参考`. liblib.art generator: Seedream 5.0 Pro/Lite, 全能图片模型V2(-Flash), Qwen Image3, Seedream 4.6/4.5, Qwen-Image, 智能图片V2; video Seedance 2.0 VIP, 海螺 2.3, 可灵 3.0 (home strip).
- **O** Generation result object = the node itself (thumbnail/video, size label, `AI生成` badge) + a 生成历史 record with type, member, rating. Results are re-usable as resources (`从生成历史选择`).
- **O** Parameters: ratio, resolution (480P–4K), duration 4–15 s, audio on/off, count 1/2/4; advanced: 联网搜索, 自动校验素材, 智能引用 AutoLink. Capability badges on liblib.art models (多参考图, 超清4K, 组图模式, 指令编辑强, 风格模型).
- **O** Reference/identity inputs: 参考 (images/videos), 标记, 角色库 preset sheets, 特效 (community effects, lock model), 运镜 (camera presets), first-frame image node wired by edge.
- **O** Variant/compare: no compare view; rating filter exists; 生成数量 up to 4 implies variant sets on a node (selection semantics U).
- **O** Community model layer on liblib.art: Checkpoint / LORA / 模板 with versions, trigger words, 推荐参数; LoRA consumed via WebUI, trainable at /pretrain.
- **U** Which LibTV node models accept community LoRA (none seen in the node model chip; likely closed API models only — I1).
