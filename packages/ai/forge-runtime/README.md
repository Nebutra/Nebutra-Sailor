# @nebutra/forge-runtime

Capability registry and invoke pipeline for **Nebutra Forge** (`forge.nebutra.com`).

- **F0 batch-1 tools** (word count, base64, URL codec, JSON format, SHA-256, UUID, unix timestamp, case convert)
- `ForgeRegistry` — list / search / categories / get by id or slug
- `invokeTool` — validate input → execute → meter metadata
- `buildToolPageModel` / `buildCategoryHub` — human tool-station page data (framework-agnostic)

## Usage

```ts
import { ForgeRegistry, invokeTool, buildToolPageModel } from "@nebutra/forge-runtime";

const registry = ForgeRegistry.openDefault();
const result = await invokeTool(registry, {
  toolId: "text/word-count",
  input: { text: "你好 world" },
});

const page = buildToolPageModel(registry, "word-count");
// page.path === "/t/word-count"
// page.api.exampleCurl — Agent surface
```

## Design

- Parent: `docs/plans/2026-07-23-nebutra-router-forge-design.md`
- Catalog: `docs/plans/2026-07-23-nebutra-forge-f0-catalog.md`
- Impl plan PR-E: `docs/plans/2026-07-23-nebutra-router-forge-implementation-plan.md`
