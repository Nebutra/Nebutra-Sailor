# seko.characters — 主体库

Route `/characters`, global rail. Account-scoped library of 主体 (subjects): tabs 个人添加 / 公共主体, 类别 filter, search, 批量上传主体, 添加新主体 (O).
A subject = 名称 + 类别 (角色 | 场景) + 音色 (optional voice upload) + 形象 (local upload or AI-generated) (O, form seen from the canvas modal, not submitted).
The same list backs the canvas rail modal and the `@` reference picker in generation prompts (O). Reference capacity per image model is 3–14 (O).
Evidence: `evidence/characters.list.webp`, `evidence/canvas.subject-library-modal.webp`, `evidence/canvas.subject-create-form.webp`.
