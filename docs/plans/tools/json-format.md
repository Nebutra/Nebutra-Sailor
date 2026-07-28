# Tool brief: json-format

## 1. User need

- **JTBD:** 粘贴脏 JSON → 校验 / 美化 / 压缩  
- **Keywords:** json格式化, json beautify, json minify  
- **Pain:** 报错行号不清、大 JSON 卡死  

## 2. Competitors

it-tools / jsonformatter.org / TinyWow — 主路径都是 textarea + format/minify。

## 3–5. Engine

| Choice | Why |
|--------|-----|
| **ECMAScript `JSON.parse` / `JSON.stringify`** | 语言内置事实标准；正确性与引擎优化即 SOTA |
| UX SOTA | 错误位置提示、一键复制、indent 控制、示例 |

手写 JSON parser = 禁止。

**内部验收状态：** `production`（JSON 引擎事实标准 + 人用 format/minify/复制/行列错误 + Agent 同路径）
