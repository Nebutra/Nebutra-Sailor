# fal — generation
- **O** One request = one model endpoint × one input object; `num_images` (1–4) batches inside a request. Output per model schema (images[] / video / audio_url) plus `seed`, `prompt`, `timings`, `has_nsfw_concepts`.
- **O** Inputs accept data URI, public URL, or `fal.storage.upload` (auto-upload of File objects); playground dropzone + "Add image from URL or paste from clipboard".
- **O** `sync_mode` returns base64 and skips history — an explicit privacy/latency trade in the form.
- **O** Safety checker is forced on in the playground; API may disable with account authorization; flagged images return black.
- **O** Pricing units: per MP (rounded up), per image (with resolution multipliers, add-ons for web search / thinking), per second (audio / voice tiers). Displayed inline on the model page and normalized on /pricing ("Output per $1").
- **O** Sandbox = multi-model generation: same prompt to N models × M repeats; Model Sets (SOTA default) as reusable picks. Post-run layout **U**.
- **O** Variants: endpoint switcher on the model header (e.g. "Text to Image [schnell] ▾"); `/edit`, `/image-to-video` etc. are sibling endpoints.
