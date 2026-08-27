# time-machine Anti-Patterns

- Do not store a second history database.
- Do not apply rollback without dry-run review.
- Do not implement merge-conflict UI in this package.
- Do not diff large media in the main process.
- Do not garbage collect starred annotations.
