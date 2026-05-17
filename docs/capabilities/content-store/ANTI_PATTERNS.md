# content-store anti-patterns

## SQLite as truth

Do not make the index canonical. Files are truth; the index can be rebuilt.

## Schema-blind retrieval

Do not ignore frontmatter. Schema-aware filtering is part of the capability.

## Unsafe paths

Do not accept absolute paths or parent traversal in tenant content paths.

## Bundled model weights

Do not bundle embedding model weights into application code. Cache model assets externally.
