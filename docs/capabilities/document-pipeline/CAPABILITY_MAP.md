# document-pipeline Capability Map

## Depends On

- `content-store`
- `llm-gateway`

## Decision Matrix

| Decision | Sailor landing | Notes |
| --- | --- | --- |
| SKIP | second RAG index | `content-store` remains the only searchable truth and index landing. |
| WRAP | parser sidecars | Complex PDF, office, OCR, and layout-aware extraction use a sidecar parser port. |
| PORT | parser router | The package chooses native or sidecar parsing by mime type. |
| PORT | metadata-preserving chunks | Parsed chunks retain tenant, source path, mime type, parser, and chunk index metadata. |

## Public Contract

- `DocumentPipeline.parse()` returns structured chunks with metadata.
- `DocumentPipeline.ingest()` writes parsed content into content-store.
- Native parsers cover markdown, HTML, and text.
- Sidecar parser absence is a suggestion-bearing error, not a silent fallback.

## Boundary Rules

- Files remain truth; SQLite/vector state belongs to content-store.
- Parser output must keep page, heading, source, and mime metadata when available.
- Persistent ingestion requires tenant context.
- Complex binary formats are not parsed with a weak text fallback.
