# @nebutra/document-pipeline

Status: WIP — Not yet integrated into any production app.

`@nebutra/document-pipeline` owns document parser routing, metadata-preserving
chunks, content-store ingestion, parser health checks, doctor output, and debug
inspection. File truth remains in content-store; this package translates
documents into indexed content units.

It does not own Thread/Turn/Item state, prompt generation, model calls,
sub-agent scheduling, or approval lifecycle. Complex parsing and OCR are
sidecar-backed capability ports, not runtime logic.

## Commands

```bash
pnpm docs:doctor
pnpm docs:debug <job_id>
pnpm docs:ingest <path>
pnpm docs:inspect <chunk_id>
```

## Examples

Executable examples live under `examples/`:

- `ingest-markdown.ts`
- `parse-html.ts`
- `sidecar-gate.ts`
