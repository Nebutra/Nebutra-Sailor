# 302.AI API 文档站（doc.302.ai）完整地图

Research date: 2026-09-09. Method: `llms.txt` + `sitemap.xml` + per-page `<id>.md` (Apifox emits OpenAPI 3.0.1 YAML per endpoint) bulk-downloaded (1967/1975 pages parsed → 1943 endpoint operations), plus browser session `r302d` for chrome/UX screenshots. Builds on `docs/plans/2026-07-23-router-302-full-route-interaction-study.md` (market shell); does not repeat its route map.

---

## 1. Summary

doc.302.ai is an **Apifox-hosted** shared project (project id `4012774`, title "302.AI API文档", zh-CN default with a Russian locale at `/ru`, light/dark toggle, LLMs.txt export). It documents ~1,950 endpoint operations under 10 sidebar roots: `API快速配置` (5 guides), `语言大模型` (148), `图片生成` (271), `图片处理` (221), `视频生成` (424), `音视频处理` (144), `信息处理` (576, of which 429 are DataForSEO pass-throughs), `RAG相关` (28), `工具API` (155), `帮助中心` (3), plus a `数据模型` (Schemas) node. Every endpoint carries two servers — `https://api.302.ai` (海外环境) and `https://api.302ai.com` (国内环境2) — and a third CN host `https://api.302ai.cn` appears in Codex/CC-switch guides. Auth is `Authorization: Bearer sk-…` everywhere, with format-specific aliases (`x-api-key` for Anthropic raw, `x-goog-api-key` for Gemini raw). The design philosophy is **"drop-in replacement + 302-exclusive suffix/param features"**: OpenAI `/v1/*`, Anthropic `/v1/messages`, Gemini `/v1beta/models/{model}:generateContent` are mirrored unchanged, while vendor-native APIs are mounted under prefixes (`/openai/v1/videos`, `/klingai/v1`, `/ws/api/v3/*` Wavespeed, `/mj/submit`, `/sd/v2beta`, `/flux/v1`, `/dataforseo/v3`, …) and 302's own unified layers live under `/302/*` (`/302/v2/image/generate`, `/302/v2/video/create`, `/302/v2/audio/tts`, `/302/general/search`, `/302/kb/*`, `/302/claude-code/*`, `/302/sandbox/*`, `/dashboard/*`). Pricing is expressed inline in every endpoint description as `**价格：N PTC/<unit>**` where **1 PTC = 1 USD** (units: /次 819×, /1M tokens, /秒, /张, /分钟, /百万字符, /页, /day, /积分, "3折"), with an authoritative price API `GET /dashboard/prices`. Rate limits are *not* documented centrally — only HTTP 429 in the status table and per-vendor concurrency notes (e.g. Hunyuan3D "默认提供1个并发").

---

## 2. Page / feature inventory

### 2.1 Site chrome (Apifox shell)

| URL | Purpose | Key elements | Actions/buttons | States | Notes |
|---|---|---|---|---|---|
| `https://doc.302.ai/` | Root → redirects to first doc `8963867m0` (302.AI CLI使用Skill) | Left tree (10 roots + 数据模型), top bar: logo "302.AI API文档", locale `🇨🇳中文` / `🇷🇺 Русский` (`/ru`), `Toggle theme`, `搜索` | Header links: `官 网`→`https://302.ai`, `价格表`→`https://302.ai/price`, `管理后台`→`https://dash.302.ai`, `更新日志`→`https://help.302.ai/docs/geng-xin-ri-zhi-2026`; page buttons `复制页面`, `LLMs.txt` | — | Canonical URL is the id-based path; no slug URLs. Footer "Built with Apifox". |
| `https://doc.302.ai/<n>e0` | Endpoint page (OpenAPI operation) | Method badge + path, description (markdown, includes price), 请求参数 (Header / Query / Path / Body tables), 请求示例代码 (tabs: Shell, JavaScript, Java, Swift, Go, PHP, Python, HTTP, C, C#, Objective-C, Ruby, OCaml, Dart, R), 返回响应 (`🟢200成功` tab + optional `x-200:失败` examples), server selector | `调试`, `Run in Apifox`, `生成代码`, `MCP`, `复制页面`, `LLMs.txt` | Sample responses per status; many endpoints have empty `{}` 401/403 schemas | Every page embeds `x-run-in-apifox` link `https://app.apifox.com/web/project/4012774/apis/api-<id>-run`. |
| `https://doc.302.ai/<n>m0` | Markdown doc page | Headings, code blocks, mermaid diagrams, tables, images from `api.apifox.com/.../resources/<id>/image-preview` | `复制页面` | — | 25 such pages (guides, ID lists, price tables). |
| `https://doc.302.ai/<n>d0` | Schema page (数据模型) | Component schema YAML | — | — | 3 schemas: `TextToVideoRequest`, `TaskCreationResponse`, `ErrorResponse`. |
| `https://doc.302.ai/llms.txt` | Machine index | Sections `## Docs`, `## API Docs`, `## Schemas`; each line `- <breadcrumb> [title](url.md): <first line of description>` | — | — | 1,978 lines; `.md` suffix on any page returns raw markdown with the OpenAPI YAML fenced block. |
| `https://doc.302.ai/sitemap.xml` | Sitemap | 1,978 `<loc>` entries | — | — | Same ids. |

### 2.2 Navigation tree (top two levels, with endpoint counts)

```
API快速配置 (5 md)      302.AI CLI使用Skill · 302.AI API集成Skill · 302-CC-Switch · Claude Code快速配置工具 · OpenClaw快速配置工具
语言大模型 (148)        迁移API指南 · 独家功能{异步调用2, MCP调用1, 联网搜索1, 图片分析1, 深度搜索1, 推理模式1, 链接解析1, 工具调用1, 长期记忆(Beta)19, 简化版格式1}
                       · 列出模型2 · Claude Code{1分钟快速配置, Claude Code沙盒31, 任意模型兼容Claude格式1}
                       · OpenAI17 · Anthropic7 · Gemini{官方格式4, Chat3} · 国产模型{Qwen3 智谱3 Minimax2 Kimi3 Deepseek2 阶跃4 豆包4 其他7}
                       · 硅基流动1 · PPIO派欧云1 · SophNet1 · 开源模型14 · 专业模型7
图片生成 (271)          通用接口{302格式V2 4, 302格式V1 1, OpenAI格式2, 说明md} · GPT-Image系列3 · DALL.E3 · Google{Nano-Banana-2 8, -2 Lite 8, -Pro 8, Nano-Banana7, Imagen5}
                       · Stability.ai9 · Midjourney8 · Midjourney-Relax7 · Midjourney-Turbo9 · 302.AI24 · Glif5 · Flux{官方API3, 24} · Ideogram3 · Recraft3 · Luma2
                       · Doubao即梦7 · Minimax海螺1 · 智谱1 · Baidu百度1 · Hidream3 · Bagel1 · 硅基流动1 · Higgsfield{官方4, 302格式(已废弃)4} · Kling可灵{302格式3, 4}
                       · 通义万相6 · Vidu2 · Wavespeed{通用接口2, 81} · Grok3
图片处理 (221)          302.AI-ComfyUI14 · 302.AI47 · Vectorizer1 · Stability.ai17 · Glif5 · Clipdrop4 · Recraft4 · BRIA18 · Flux{官方2, 10} · Hyper3D2 · Tripo3D3 · FASHN2
                       · Ideogram10 · Doubao即梦8 · Kling可灵4 · 阶跃星辰1 · Bagel1 · 共绩算力{Flux Dev2, Flux Kontext Dev4, Face Swapper2, Clothes Changer4, Anything Changer4, Image2Reality2, Style Transfer2, Image Eliminater2}
                       · Hunyuan3D16 · Hidream1 · 通义万相8 · Topazlabs9 · Wavespeed{通用2, 1} · Photoroom3 · 其他模型6
视频生成 (424)          通用接口{V2 4, V1 2} · Minimax海螺12 · PixVerse8 · 即梦19 · 302.AI12 · 302.AI-ComfyUI4 · OpenAI8 (Sora) · Google{官方4, 18 Veo} · Stable Diffusion2 · Luma AI4
                       · Runway11 · Kling可灵{302格式46, 官方格式18} · CogVideoX智谱4 · Pika9 · Genmo2 · Hedra{2.0 4, 3.0 5} · Haiper5 · Sync.2 · Wavespeed{通用2, 100} · Lightricks4
                       · Hunyuan混元2 · Vidu15 · 通义万相{阿里云9, 开源部署14} · 硅基流动2 · 昆仑万维2 · Higgsfield{官方5, 302格式(已废弃)5} · 蝉镜数字人8 · Midjourney3
                       · Topview{营销数字人4, 普通数字人8, 商品数字人8, 商品图替换10, 图生视频2, Avatar 4 10, 1} · Viggle1 · 共绩算力{Video Face Swapper2} · Gaga4
音视频处理 (144)        通用接口{TTS{302格式V2 3, V1 1, OpenAI格式1, 查询供应商1}, transcriptions2} · 302.AI{Higgs Audio4, IndexTTS-2 2, F5-TTS3, MMAudio3, VoxCPM-TTS2, SoulX-Podcast3, 音频转文字4, 视频相关4, 音频翻译2, 其他2}
                       · OpenAI4 (Speech/Transcriptions/Translations/Realtime) · Azure2 · Suno13 · 豆包7 · Fish Audio6 · Minimax8 · Dubbingx4 · Elevenlabs{302格式8, 官方格式10} · Mureka10
                       · 硅基流动5 · Google3 · 蝉镜数字人5 · Mistral1 · Kling可灵4 · 通义万相4 · Topazlabs2 · Stability3 · 智谱4 · Wavespeed{通用2, 2}
信息处理 (576)          302.AI{代码运行11 (虚拟机沙盒9 + 静态沙盒1 + E2B md), 管理后台10, 文件处理5, 远程浏览器3, Paper2Code3, Paper2Poster3, LLMxMapReduce2, LangExtract2, Dots.OCR2, MiniCPM2, PDF翻译2}
                       · 通用搜索接口1 · Tavily2 · SerpApi8 · Search1API5 · Exa5 · 博查AI2 · Doc2x{V2 4, V1(已废弃)6} · Glif1 · Jina4 · DeepL4 · RSSHub1 · 流光卡片1 · 有道1 · Mistral1
                       · Firecrawl11 · 秘塔搜索3 · MinerU4 · 智谱Agent4 · Unifuncs2 · Sophnet2 · Perplexity1 · 豆包1 · Aminer{数据获取15, 数据消歧2, 数据查询6, 学术问答2, 组合接口3}
                       · Dataforseo{SERP130, AI Optimization36, Keywords Data57, Domain Analytics11, Labs45, Backlinks22, OnPage27, Content Analysis10, Merchant23, App Data29, Business Data39}
RAG相关 (28)            OpenAI1 · Jina4 · 国产模型7 · 302.AI10 (知识库) · 硅基流动2 · Google1 · Voyage3
工具API (155)           Pay with 302 (2 + 签名md) · AI PPT制作13 · 网站一键部署9 · AI图像创意站{5 + 请求使用示例73} · AI视频素材创意站4 · AI论文写作{CO-STORM4, 2} · AI播客制作5
                       · AI文案助手2 · AI视频深度翻译9 · AI文档编辑器2 · 网页数据提取工具3 · AI提示词专家4 · AI 3D建模1 · AI搜索大师3.0 1 · AI矢量图生成1 · AI答题机1 · AI学术论文搜索2 · AI头像制作2 · AI卡片生成4 · AI数字人5
帮助中心 (3 md)         HTTP状态码及其含义 · 图片翻译支持语言 · 有道翻译支持语言
数据模型 (3)            TextToVideoRequest · TaskCreationResponse · ErrorResponse
```

### 2.3 Base URLs, auth, conventions

| Item | Value |
|---|---|
| Servers (every endpoint) | `https://api.302.ai` "海外环境", `https://api.302ai.com` "国内环境2"; guides also use `https://api.302ai.cn` (Codex base `https://api.302ai.cn/codex`; file host `file.302ai.cn`) |
| File CDN | Results are re-hosted to `https://file.302.ai/gpt/imgs/<yyyymmdd>/<hash>.<ext>` (CN: `file.302ai.cn`); TTS at `file.302.ai/gpt/tts/<uuid>.mp3` |
| Auth header | `Authorization: Bearer sk-…` (1,900+ ops). Aliases: `x-api-key: sk-…` (Anthropic raw), `x-goog-api-key` (Gemini raw). Pay-with-302 uses the app **Secret KEY**, not an LLM key |
| Key source | "管理后台-API KEYS里生成的API KEY" (dash.302.ai) — key format `sk-…`; one key works for all 1400+ APIs |
| Key scopes/flags (from `/dashboard/api_keys`) | `api_name`, `api_key`, `allow_save_logs`, `allow_manage_key`, `allow_custom_model`, `limit_cost`, `current_cost`, `limit_daily_cost`, `current_date_cost`, `expired_on` (unix ts, 0 = never) |
| Migration rule | Replace `api.openai.com` → `api.302.ai` (or `/v1` → `/v1`); base-URL for OpenAI-format *non-OpenAI* image/TTS models is `https://api.302.ai/302` (SDK `base_url="https://api.302.ai/302"`) |
| Content types | `application/json` 1,248 ops · `multipart/form-data` 195 · no-body GET 496 · x-www-form-urlencoded 2 · xml 2 |
| Streaming | OpenAI SSE `data: … / data: [DONE]`; Claude-format SSE; Gemini `streamGenerateContent`; Realtime via `wss` (`/v1/realtime?model=`); GPT-Image `stream=true` + `partial_images 0-3`; TTS `stream_format: audio|url` ("暂不支持SSE"). Caveats: tool-use prompt mode and MCP mode disable/break streaming; Qwen3 "暂时不支持非流式输出"; Claude Code sandbox chat is **stream-only** |
| Async convention A (LLM) | Any `/v1/chat/completions` + query `?async=true[&callback=URL]` → `{task_id}`; poll `GET /v1/async_result?task_id=&llm_content_extract=true` → `{content_type,data,err,extracted_content,status_code}` |
| Async convention B (302 v2 media) | POST create → `{task_id,status:"pending",created_at}`; `GET …/fetch/{task_id}` → `{status: completed|failed, image_url/video_url/audio_url, image_urls[], raw_response, req, model, execution_time, attempts, upstream_task_id, webhook, ai302_cost_request_ids}`; query `run_async=true`, `webhook=URL` (webhook implies async; 200 = ack; retried 3× with 2·N s backoff) |
| Async convention C (vendor mounts) | `/302/submit/<model>` POST + `/302/submit/<model>-async` GET; `/302/task/{id}/fetch`; `/mj/task`, `/klingai/task`, `/ws/api/v3/predictions/{requestId}/result`, `/openai/v1/videos/{id}` |
| Request tracing | Response header `request-id` → `GET /dashboard/record/{request-id}` returns `{cost, input_token, output_token, model, process_time}` |
| Error body (documented) | `ErrorResponse {code, message, request_id}` with codes `InvalidParameter`, `MissingParameter`, `Unauthorized`, `RateLimitExceeded`, `InsufficientBalance`, `InternalError`; task-style APIs use `{status, message, data:{state, progress, error:{err_code, message}}}`; some vendor mounts return `1002 触发限流` / `1004 账号鉴权失败` numeric codes; LLM examples show OpenAI-style `{"error":{…}}` only via generic 4xx tabs |
| HTTP status table (帮助中心) | 400 请求格式错误 · 401 API密钥验证未通过/令牌过期 · 403 权限不足 · 404 端点不存在 · 413 请求体太大 · 429 超过速率限制 · 500 · 503 |
| Rate limits | **Not centrally documented.** Only: 429 row; `RateLimitExceeded` code; vendor notes ("默认提供1/3个并发", Hunyuan3D; Doubao "RPM 和并发数配额较低（详见模型列表）"); Firecrawl `limit`/`delay` params |
| Locales | zh-CN (default), ru (`/ru`); no English docs site |

### 2.4 Endpoint families (core surface)

| Family | Method · Path | Auth | Key fields | Response | Price expression | Notes |
|---|---|---|---|---|---|---|
| Models list | `GET /v1/models?llm=1\|0&include_custom_models=1` | Bearer | query filters | `{object:"list", data:[{id, object:"model"}]}` (docs say "并提供有关每个模型的价格" but schema shows only id/object) | — | `llm=1` LLM only, `0` non-LLM |
| Model status | `GET /v1/status?model=` | Bearer | | `data:[{id, object, first_byte_req_time:"1.99"}]` | 免费 | TTFB monitor; `gpt-4-gizmo-*` wildcard appears |
| Chat | `POST /v1/chat/completions` | Bearer | OpenAI params: model, messages, temperature, top_p, n, stream, stop, max_tokens, presence/frequency_penalty, logit_bias, user, tools, response_format | OpenAI chat.completion | "价格请查看 https://302.ai/price"; custom model **0.05 PTC/day** | 89 ops documented on this path (one per vendor/feature) |
| Chat simplified | `POST /v1/chat/completions` `{model, message}` | Bearer | | `{output}` | 0.05 PTC/day custom | "简化版API" |
| Responses | `POST /v1/responses` `{model, input}` | Bearer | | OpenAI Responses | as chat | o3-pro, codex-mini-latest are Responses-only; Deep-Research variant |
| Codex | `POST /codex/v1/responses` | Bearer | base `https://api.302.ai/codex` | | **原模型价格的3折**, 支持缓存命中 | "无法在非CodeX环境下使用" |
| Messages (Anthropic raw) | `POST /v1/messages` | `x-api-key` or Bearer | model, messages, max_tokens, system, stop_sequences, top_k, thinking{type:enabled,budget_tokens}, tools | Anthropic message incl. `usage.cache_creation_input_tokens/cache_read_input_tokens` | | 12 ops; "任意模型兼容Claude格式": *any* model (incl. custom) via Claude format; 128k output for claude-3-7/opus-4-6 |
| Gemini raw | `POST /v1beta/models/{model}:generateContent` (+`streamGenerateContent`) | `x-goog-api-key` | contents, generationConfig | Gemini candidates | | 7 ops |
| Embeddings | `POST /v1/embeddings` `{model, input}` | Bearer | | OpenAI list | Jina/Voyage per-token e.g. `0.0002 PTC/1000 token` | 9 ops (OpenAI, Jina, 智谱, BAAI, 百川, 有道, 硅基, Google, Voyage) |
| Rerank | `POST /v1/rerank` (Jina/Voyage/硅基/有道/BAAI) · `POST /v1/reranks` (qwen3-rerank) | Bearer | model, query, documents[], top_n | `{results:[{index, relevance_score, document}], usage.total_tokens}` | `0.05 PTC / 1M Token` (Jina), `0.07 PTC / 1M tokens` (Qwen) | Path plural inconsistency |
| Tokenizer | `POST /jina/v1/…` Tokenizer（文本切片） | Bearer | | | | Jina |
| Images (OpenAI) | `POST /v1/images/generations` · `/edits` · `/variations` | Bearer | prompt, model enum[gpt-image-1, -1-mini, -1.5, -2, dall-e-2/3], n 1-10, size, quality, background, moderation, output_format, output_compression, stream, partial_images; query `response_format`, `async` | `{created, data:[{url\|b64_json, revised_prompt}], usage{input_tokens, output_tokens, *_details}}` | per-model | `GET /v1/images/…异步获取图片` when `async=true` |
| Images (302 OpenAI-format for any vendor) | `POST /302/images/generations` · `/302/images/edits` | Bearer | OpenAI body + `aspect_ratio` etc.; query `webhook` | OpenAI shape `{created, data, usage}` | per-model (model list in kdocs) | SDK `base_url="…/302"`; `response_format` enum `url\|bs64_json\|其他任何值` (sic) |
| Images (302 unified v2) | `POST /302/v2/image/generate?run_async&webhook` · `GET /302/v2/image/fetch/{task_id}` | Bearer | prompt, model, width/height, aspect_ratio, negative_prompt, output_format, image, mask_image (json or multipart) | task object with `image_url`, `image_urls[]`, `raw_response`, `status`, `task_type:"image"` | 依据对应图片模型 | V1 `POST /302/image/generate` deprecated-ish; sync polls upstream every 3 s ×30 |
| Video (302 unified v2) | `POST /302/v2/video/create?webhook` · `GET /302/v2/video/fetch/{task_id}` · `GET /302/v2/model/video` | Bearer | prompt, model, image (multi), end_image, video, negative_prompt, duration, resolution, aspect_ratio, fps | `{task_id, status, created_at}` → fetch incl. `video_url`, `mode: t2v\|i2v\|v2v`, `upstream_task_id`, `ai302_cost_request_ids` | 根据模型 | Model-name rules: `-`/`_` interchangeable, case-insensitive, legacy suffixes `-t2v/-i2v/-v2v` tolerated; task type inferred from `image`/`end_image`/`video` presence |
| Video (Sora official) | `POST /openai/v1/videos` · `/{id}/remix` · `GET /{id}` · `DELETE /{id}` · `GET /{id}/content` | Bearer | prompt, model enum[sora-2, sora-2-pro], seconds enum[4,8,12], size enum[1280x720,720x1280,1024x1792,1792x1024], input_reference, callback | `{id:"video_…", object:"video", status:"queued", progress, remixed_from_video_id, seconds, size}` | `PTC/秒` table: sora-2 0.1, sora-2-pro 0.3/0.5 | Also `Chat（视频生成）` = Sora via chat/completions for chatbots |
| Audio TTS (OpenAI) | `POST /v1/audio/speech` | Bearer | model tts-1/tts-1-hd/gpt-4o-mini-tts, input ≤4096 chars, voice (11 names), response_format, speed 0.25-4, instructions | binary | `tts-1 15PTC/百万字符`, `tts-1-hd 30PTC/百万字符`, `gpt-4o-mini-tts 0.6/12 PTC per 1M Tokens` | |
| Audio TTS (302 OpenAI-format multi-vendor) | `POST /302/audio/speech` | Bearer | input, model (vendor), voice, response_format enum[mp3,opus,aac,flac,wav,pcm], speed, volume, stream_format enum[audio,url] | `{audio_url, format}` or binary | 依据供应商 | |
| Audio TTS (302 unified v2) | `POST /302/v2/audio/tts?run_async&webhook` · `GET /302/v2/audio/fetch/{task_id}` · `GET /302/tts/provider?provider=` | Bearer | text, provider enum[openai,doubao,azure,fish,minimaxi,dubbingx,elevenlabs,elevenlabs-official,meruka,google,qwen], model, voice, speed, volume, emotion, output_format, timeout | task incl. `audio_url`; provider catalog `{provider_list:[{provider, req_params_info:{model_list, voice_list:[{name, voice, sample{zh}, emotion[], gender}]}}]}` | 依据供应商 | Voice catalog with audio samples |
| Audio ASR (OpenAI) | `POST /v1/audio/transcriptions` · `/translations` · `POST /v1/realtime` | Bearer (multipart) | file, model enum[whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-4o-transcribe-diarize], response_format enum[json,text,srt,verbose_json,vtt,diarized_json], language, prompt, temperature, chunking_strategy | `{text}` | `whisper-1 0.006 PTC/分钟`; `gpt-4o-transcribe 输入6/输出10 PTC/1M`; 302 own ASR `0.002 PTC/分钟` | 302 also has `/v1/audio/alignments` (字幕打轴) |
| Audio ASR (302 unified) | `POST /302/v1/audio/transcriptions` · `GET` same path lists models | Bearer | file (binary/url/base64), model, response_format, language | `{success, model_list}` for GET | 根据模型 | |
| Search (unified) | `POST /302/general/search` | Bearer | query, provider (tavily, search1_search, search1_news, bocha, exa, firecrawl, metaso, unifuncs, perplexity…), max_results, category, time_range, include/exclude_domains, include_images, exa date filters, crawl_results | `{search_results:[{url,title,description,content,published_at,summary,images}]}` | 依据供应商 | |
| Files | `POST /302/upload-file` (multipart, ≤50 MB) · `GET /302/file/parsing?url=` · `POST /302/markitdown/convert` · `POST /v1/htmltopng` · Link-to-IMG | Bearer | | `{code:200, data:"https://file.302.ai/…", message}` | `0.001 PTC/次` upload; parsing `0.02 PTC/1M Token`; markitdown `0.01PTC/1M Token`; htmltopng 免费 | No OpenAI `/v1/files` or `/v1/batches` documented |
| Code sandbox | `POST /302/run/code` `{language: python3\|nodejs, code}` · `POST /302/sandbox/direct_run_code` · `/302/sandbox/{create,list,destroy,run_code,run_command,files,import,export}` | Bearer | language enum[python,r,java,bash,js], envs, is_download, download_path, timeout | `{result:{stdout[],stderr[],file{url}}}` | `0.005 PTC/次`; sandbox `秒数×0.001PTC + 0.001PTC/次 export` | MCP server github.com/302ai/302_sandbox_mcp |
| Remote browser | `POST /302/browser/submit` · `GET …status` · sync variant | Bearer | task, model | `{task_id}` | `0.001 PTC/秒 + 模型费用` | Browser Use |
| Knowledge base (RAG) | `/302/kb/create_knowledge_base`, `DELETE /302/kb/delete_knowledge_base/{kb_id}`, `…/upload/files`, `DELETE …/delete_docs`, `GET …/list_knowledge_bases`, `GET …/info/{kb_id}`, `POST /302/kb/chat/knowledge_base_chat`, `POST /302/kb/v1/chat/completions`, `…/text_meta_chunking`, `…/file_meta_chunking` | Bearer (KB-bot key auto-binds kb) | kb_id (int), model_name, query, stream, history[], top_k, score_threshold, temperature | `{code:0,msg:"success",data:{answer}}` | KB CRUD 免费; chat/upload 根据模型 | |
| Long-term memory | `POST /v1/chat/completions` + `userid` (uuidV4) · `/memobase/api/v1/{users,blobs,users/profile,users/event,users/context}` (18 ops) | Bearer | | | 限时免费 (model tokens only) | Memobase partner |
| Claude Code sandbox | `/302/claude-code/sandbox/{create,list,delete,reset,mcp/add,session,project/init,file/list,file/download,file/upload,file/operation,deploy}`, `/302/claude-code/commands`, `/302/claude-code/skills/{list,detail,batch/download,sync,favorite/add,favorite/cancel}`, chat via `/v1/chat/completions` or `/v1/messages` with `model = sandbox_id` | Bearer + header/body `session_id` | llm_model, system_prompt, mcp_servers, sandbox_name, max_thinking_token, auto_pause_seconds; chat `action: enum[plan]`, `available_skills[]` | `{success, data:{sandbox_id:"302-sandbox-…", sandbox_name}}`; stream-only chunks; result block prefixed `\n\n---\n**[Conversation Result]**\n\n` | `0.0005 PTC × 沙盒使用秒数 + LLM token` | Slash commands in prompt: `/commands`, `/deploy`, `/model`, `/max_thinking_token`, `/plugin` |
| Admin | `GET /dashboard/balance` · `GET /dashboard/record/{request-id}` · `GET /dashboard/api-record?page&limit≤50&start_time&end_time` · `GET /dashboard/prices?path=/chat/completions&lang=zh` · `GET/POST/PUT/DELETE /dashboard/api_key[s]/{api_name}` · `GET /sso/login?app&icon&weburl&redirecturl` | Bearer with `allow_manage_key` | | balance `{data:{balance:"…"}}`; prices `{code:0,msg,data:[{name, tag, pricing{input,output}, pricing_prefix, pricing_suffix:"1M tokens", description}]}`; api-record `{items[], pagination{total_page,cur_page,pre_page,next_page,offset,limit}}` | 免费 / 0 PTC | Requires key permission toggle (screenshot in doc) |
| Pay with 302 | `POST /v1/checkout` · `GET /v1/checkout?checkout_id=` | Bearer = app Secret KEY | app_id, price (**cents**, 100 = $1), customer{}, success_url, back_url, request_id, metadata, secret, signature (HMAC-SHA256 over sorted, URL-encoded params), langs[], channels[] | `{id, app_id, mode, checkout_url, status, price, customer, request_id, success_url, metadata}`; redirect adds `checkout_id` + `302_signature`; webhook header `302_signature` | funds → 302 balance, withdraw after 7 days | |
| Vendor mounts (pattern) | `/openai/v1/*`, `/klingai/v1/*`+`/klingai/task`, `/mj{,-relax,-turbo}/submit|task`, `/sd/v2beta/*`, `/flux/v1/*`, `/ws/api/v3/{vendor}/{model}` + `/ws/api/v3/predictions/{requestId}/result`, `/302/submit/{model}[-async]`, `/302/task/{id}/fetch`, `/dataforseo/v3/*`, `/aminer/gateway/*`, `/doc2x/api`, `/firecrawl/v1|v2`, `/serpapi/search`, `/bigmodel/api`, `/siliconflow/v1`, `/minimaxi/v1|v2`, `/vidu/ent`, `/topview/v1|v2|v3`, `/chanjing/open`, `/tencent/hunyuan3d`, `/bria-ai/v1`, `/aliyun/api`, `/volcengine/api`, `/doubao/*`, `/google/v1`, `/mureka/v1`, `/fish-audio/model`, `/elevenlabs/*`, `/suno/submit`, `/pika/generate`, `/runway{,_turbo}/submit`, `/luma/submit`, `/higgsfield/v1|apps|task`, `/hedra/*`, `/sync-so/v2`, `/gaga/v1`, `/photoroom/v1`, `/tripo3d/v2`, `/topazlabs/*` | Bearer (302 key replaces vendor key) | vendor-native bodies | vendor-native | inline PTC | Mount prefix = vendor slug; "302格式" vs "官方格式" folders coexist; "已废弃" folders kept |
| Apps (工具API) | `/302/ppt/*` (13), `/302/webserve/*` (网站一键部署 9), `/302/gpt-image-creative/*` (75 examples), `/302/stock-video`, `/302/writing`, `/302/podcast`, `/302/vt` (video translate 9), `/302/crawler`, `/302/prompt`, `/302/card`, `/302/paper`, `/302/paper2code`, `/302/paper2poster`, AI数字人 | Bearer | app-specific; PPT templates isolated per apikey | `{code, msg/message, data}` | e.g. PPT `0.07PTC/次`, outline 免费 | These are the SaaS "apps" exposed as APIs |

### 2.5 SDK / quickstart pages

| Page | URL | Content |
|---|---|---|
| 迁移API指南 | `3704971m0` | "完全对齐 OpenAI 官方…将 api.openai.com 替换为 api.302.ai"; Bearer key note |
| 302.AI CLI使用Skill | `8963867m0` | `302ai` CLI + SKILL.md for Claude Code/Cursor; modules image/video/tts/stt/sfx/3d/song/search; commands `302ai image create --prompt --model`, `302ai video fetch <taskid> --short`, `302ai tts refresh`, `302ai model list <type>`; install by telling the agent "安装这个skill：https://github.com/302ai/302ai-cli-skill/blob/master/SKILL.md" |
| 302.AI API集成Skill | `8093177m0` | Agent skill that searches 1400+ APIs and emits code; `BASE_URL = "https://api.302.ai"`, `Authorization: Bearer`; repo github.com/302ai/302AI-API-Integration-Skill |
| 302-CC-Switch | `9185365m0` | Fork of cc-switch (v3.16.6) DMG/EXE via `file.302.ai` / `file.302ai.cn` |
| Claude Code快速配置工具 / 1分钟快速配置 | `8138563m0`, `8093176m0` | `npx 302cc` wizard: 语言 → API Key → 模型 → 节点(国际/国内) → 应用配置; menu of 7 options |
| OpenClaw快速配置工具 | `8138564m0` | `npx 302oc` same wizard |
| Codex CLI | `359389143e0` | `OPENAI_BASE_URL="https://api.302.ai/codex"`, 3折 |
| Claude Code沙盒 · 第三方客户端接入教程 | `7591261m0` | Cherry Studio: API 地址 `https://api.302.ai`, model = sandbox id, custom param `session_id`, `/deploy --session_id` |
| OpenAI SDK snippets | in `/302/images/generations`, `/302/images/edits`, `/302/audio/speech` | `OpenAI(base_url="https://api.302.ai/302", api_key=…)`, `extra_body={"aspect_ratio":"16:9"}` |
| Vercel AI SDK | referenced in search sample | `302ai/ai-sdk` provider |
| Per-page code gen | every endpoint | 15-language tabs + `生成代码` + `Run in Apifox` |

---

## 3. Entities and fields

| Entity | Fields / formats observed |
|---|---|
| API key | `sk-…` string; object `{id:int, api_name, api_key, allow_save_logs:bool, allow_manage_key:bool, allow_custom_model:bool, limit_cost:int, current_cost, limit_daily_cost:int, current_date_cost, expired_on:int unix (0=none)}`; created via `POST /dashboard/api_key` requiring all flags |
| Currency | **PTC** (1 PTC ≙ $1; custom model "0.05美元/天" = 0.05 PTC/day). Price API returns numbers with `pricing_suffix:"1M tokens"`, `pricing_prefix:""`; `tag` e.g. "OpenAI模型"; `lang` zh/en |
| Price units seen | `PTC/次` (819 ops), `PTC/1M tokens` (input/output split), `PTC/秒` (video, sandboxes), `PTC/张`, `PTC/分钟`, `PTC/百万字符`, `PTC/页`, `PTC/day`, `PTC/积分` (1积分=0.05 or 0.005 PTC), `PTC/1000 token`, `PTC/百万像素`, `PTC/音色`, `PTC/帧`, "原模型价格的3折", "按API返回costDollars结算，官方原价", "以wavespeed为准", "限时免费", "免费"/"0 PTC" |
| Seedance price table | columns: 模型 · 单价(无声 PTC/M Tokens) · 有声单价 · 分辨率 · 画面比例 · 长边(像素) · 短边(像素) · 帧率 · 时长(秒) · 用量(token) · 视频价格(无声/PTC) · 视频价格(有声/PTC) |
| Model id | Provider ids verbatim (`gpt-4o-mini`, `claude-sonnet-4-5-20250929`, `gemini-2.5-flash`); 302 aliases with **suffixes**: `-web-search`, `-ocr`, `-deep-search`, `-fusion`, `-file-parse`, `-thinking` (e.g. `claude-3-7-sonnet-20250219-thinking`, `claude-opus-4-6-thinking`, `kimi-k2-thinking`), combinable (`deepseek-r1-ocr-web-search`); GPTs `gpt-4-gizmo-g-<id>`; `-latest` pointers (`claude-3-7-sonnet-latest`); media suffixes `-t2v/-i2v/-v2v/-r2v/-t2i/-i2i`; vendor-prefixed (`minimaxi-t2v-01`, `302ai-flux-kontext-max-t2i`, `doubao-seedance-1-0-lite-i2v`, `official-kling-v3`); Wavespeed slash ids (`bytedance/seedream-v4`); Suno/Minimax song ids `chirp-v4@suno`, `music-2.5@minimax`; sandbox ids `302-sandbox-xxxxxxx` used *as* model |
| Suffix-equivalent params | `"web-search":true`, `search-service`(search1api default|tavily|exa|bocha|metaso), `search-results` 1-20 (default 10), `search-include-sites[]`, `search-exclude-sites[]`; `ocr_model`; `"deep-search":true`, `searchType`; `"-fusion":true`, `thinking-model`; `"file-parse":true`, `parse-service`; `tool-use-mode` 1 auto/2 native/3 prompt; `mcp_servers:[{url,name}]`; `userid` uuidV4 |
| Task (302 v2) | `task_id` uuid (image/audio) or numeric string (video "301504317665393"); `status` enum `pending|processing|completed|failed`; `task_type` `image|video|audio`; `created_at/started_at/completed_at/updated_at/failed_at` ISO-8601 Z; `execution_time` string seconds; `attempts`; `webhook`; `upstream_task_id`; `req` (echo); `raw_response`; `error{error,message,error_type,attempts,execution_time,is_network_error}`; `request_id` in webhook ("不是task_id, 用于后续追踪"); `ai302_cost_request_ids[]` |
| Usage | OpenAI `{prompt_tokens, completion_tokens, total_tokens}`; Anthropic `{input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens}`; image `{input_tokens, output_tokens, input_tokens_details{image_tokens,text_tokens}, output_tokens_details}` |
| Billing record | `GET /dashboard/record/{request-id}` → `{cost:number, input_token, output_token, model, process_time}`; api-record paginated `{items, pagination{total_page, cur_page, pre_page, next_page, offset, limit}}` with `limit` max 50, times as unix seconds |
| Checkout | `price` integer **cents**; `status`; `mode`; `checkout_url`; signature HMAC-SHA256 hex over `key=value&…` (sorted, filtered empties, JSON-compact nested, encodeURIComponent) |
| Knowledge base | `kb_id` int (e.g. 1000); bot-bound keys |
| TTS provider catalog | `provider`, `req_params_info.model_list[]`, `voice_list[{name, voice, sample{zh:url}, emotion[], gender}]` |
| Sandbox | `sandbox_id` "302-sandbox-…", `session_id`, `llm_model`, `max_thinking_token`, `auto_pause_seconds` (≤60 s), skills bound to apikey |
| Error | `ErrorResponse{code:string enum, message, request_id uuid}`; task error `{err_code:int, message}`; vendor numeric `0 成功 / 1002 限流 / 1004 鉴权失败` |
| Search result | `{url, title, description, content, published_at, summary, images[]}` |

---

## 4. UX patterns worth copying / anti-patterns

**Copy**
1. **Price on every endpoint, same slot** — bold `**价格：…**` line in the description, plus a machine price endpoint (`/dashboard/prices?path=`). Router should render price inline on each model/endpoint card and expose it via API with `{pricing{input,output}, pricing_suffix}`.
2. **Two-mode feature toggles** — every 302-exclusive feature can be enabled by *model suffix* (for third-party clients that only accept a model string) **or** by *request param* (for API users). This is the single most reusable idea for a router: `model: "x-web-search"` ≡ `{"web-search": true}`.
3. **Drop-in base-URL story** — "replace `api.openai.com` with `api.302.ai`"; separate sub-base `…/302` for OpenAI-format access to non-OpenAI models, `…/codex` for Codex. Keep format mirrors byte-compatible; mount vendor-native APIs under `/<vendor>/…`.
4. **Unified async contract** — `?run_async=true`, `?webhook=`, `fetch/{task_id}`, uniform task object with `status`, timestamps, `raw_response`, and `*_url` + `*_urls[]`. Webhook = "any 200 acks, retry 3×".
5. **Per-request cost lookup** by `request-id` response header (`/dashboard/record/{id}`) and a log endpoint (`/dashboard/api-record`) with unix-time range + `limit≤50`.
6. **Key-scoped permissions** (`allow_manage_key`, `allow_custom_model`, `allow_save_logs`, `limit_cost`, `limit_daily_cost`, `expired_on`) — mirrors what Router's key dialog should expose.
7. **Quickstart CLIs** (`npx 302cc`, `npx 302oc`) and **agent skills** (SKILL.md links) as first sidebar group; language-tab code samples; "Run in Apifox"/"生成代码" affordances; LLMs.txt export.
8. **Model naming tolerance** (case-insensitive, `-`/`_`, legacy suffixes) + `GET /302/v2/model/video` capability list — auto-infer task type from payload.
9. **Provider catalog endpoints** (`/302/tts/provider` with voice samples, `/302/v1/audio/transcriptions` GET model list) — good for populating UI pickers.
10. **Status/TTFB endpoint** (`/v1/status`) — cheap health signal per model.

**Anti-patterns**
- Prices live in prose/kdocs links (`https://kdocs.cn/l/…`) for many families → not machine readable; parameter enums typo'd (`bs64_json`), phantom required fields (`01JPME2T72ZWEZV0C8WGQNGDCE`) from Apifox schema bugs.
- Path inconsistencies: `/v1/rerank` vs `/v1/reranks`; `/302/images/generations` vs `/302/v2/image/generate` vs `/302/submit/<model>`; three generations of "通用接口" (V1/V2/OpenAI格式) plus "已废弃" folders still visible.
- No rate-limit doc, no error-code catalog for the LLM path, no `/v1/files`/`/v1/batches`.
- Sidebar has 1,900 leaves; DataForSEO alone is 429 nodes — needs search to be usable. Header links "价格表"/"管理后台" leave the docs shell.
- Two Chinese CN hosts (`api.302ai.com` in servers vs `api.302ai.cn` in guides) — ambiguous.
- Mixed response envelopes: OpenAI-shape, `{code:0,msg,data}`, `{success,data}`, `{code:200,data,message}`, raw vendor.

---

## 5. Screenshots

- `.trellis/tasks/09-08-router-302-parity/research/shots/doc-root-sidebar.png` — root (CLI Skill doc) with full sidebar, locale switch, theme toggle
- `.trellis/tasks/09-08-router-302-parity/research/shots/doc-chat-endpoint.png` — `POST /v1/chat/completions` page: params table, 15-language code tabs, `调试 / Run in Apifox / 生成代码 / MCP / LLMs.txt`
- `.trellis/tasks/09-08-router-302-parity/research/shots/doc-video-v2-create.png` — `/302/v2/video/create` (model-name rules, webhook)
- `.trellis/tasks/09-08-router-302-parity/research/shots/doc-cc-sandbox-intro.png` — Claude Code沙盒介绍 (mermaid diagrams)

Raw corpus kept in scratchpad: `…/scratchpad/llms.txt`, `rows.json`, `inventory.json` (1,943 ops: pid, section, title, method, path, price, auth, content-type), `all/*.md` (1,967 pages).

---

## 6. Open questions

1. `GET /v1/models` description promises per-model price but the schema/example only show `{id, object}` — need a live call (owner key) to see if `pricing` fields are actually returned; `/dashboard/prices` is the safer contract.
2. Actual rate limits / concurrency per key or per model are undocumented — is there a header (`x-ratelimit-*`) or dashboard setting? Check `dash.302.ai` and the 429 body.
3. Which CN host is canonical for API (`api.302ai.com` in OpenAPI servers vs `api.302ai.cn` in Codex/CC-Switch guides)?
4. Codex "3折" and "custom model 0.05 PTC/day" — how are these surfaced in the price page / billing records (`tag`?).
5. `/sso/login` (API-SSO) semantics (`app, icon, weburl, redirecturl`) — is this the "Pay with 302"/"Use" shell login handoff? Response schema mistakenly reuses `{items,pagination}`.
6. Whether `-web-search` etc. suffixes are accepted on `/v1/messages` and `/v1/responses` as well as `/v1/chat/completions` (only chat documented).
7. English docs: only zh and ru locales exist; is the English site elsewhere (302.ai/en price page vs docs)?
8. 8 of 1,975 pages failed to download (timeouts) — not inspected; none in the core families above.
