# idea-plaza Replication Guide

1. Build a `PublishIdeaRequest` with a surface/detail/cloneable level.
2. Run sensitive-field scan.
3. Add explicit redactions when private data is detected.
4. Publish a local snapshot.
5. Fork only from an existing snapshot and keep attribution on.
