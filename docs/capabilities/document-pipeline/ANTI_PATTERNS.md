# document-pipeline Anti-Patterns

- Do not build a second vector store or RAG index here.
- Do not parse every file type with one generic parser.
- Do not drop source path, mime type, page, heading, or chunk metadata.
- Do not ingest complex binary documents with a fake text fallback.
- Do not run parser subprocesses in the main runtime process.
