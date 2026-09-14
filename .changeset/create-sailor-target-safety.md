---
"create-sailor": patch
---

Never delete the target directory when a template download fails, and cut the
template download from 126 MB to ~25 MB.

`cloneTemplate` called a `resetDirectory(targetDir)` helper — an unguarded
rm -rf over every entry of the target — from the catch of its source loop.
Scaffolding into the current directory from `~` therefore aimed that rm -rf at
the user's home directory, and a failed download was enough to fire it. The
SIGINT handler had the same shape: `rm -rf resolvedTarget` with a
default-yes confirm, which with `resolvedTarget === "."` was the user's cwd.

- The template is now downloaded, extracted and stripped in a temp staging
  directory, and copied into the target exactly once, only after a source has
  fully succeeded. A failed clone leaves the target byte-for-byte untouched.
- Ctrl+C cleanup removes only the entries the clone created, never the target
  directory it did not create.
- The home directory, the filesystem root, the standard user folders
  (Desktop/Documents/Downloads/Library/…) and `.config` are refused as scaffold
  targets on every route, and the interactive flow no longer offers
  "In the current directory" from them.
- The archive streams to disk instead of being buffered whole in memory, with a
  30s stall timeout (not a whole-request one), three attempts with backoff, and
  truncation detection.
- The download reports live progress instead of leaving the terminal silent for
  the whole transfer, and a failure now names the cause (DNS, reset, TLS
  interception) plus the offline `SAILOR_TEMPLATE_LOCAL_DIR` workaround,
  instead of a bare "fetch failed".
- `.templateignore` drops 109 MB of Nebutra reference material that was
  shipping into every scaffold — design-system screenshots, brand VI proposals,
  and the research corpus.
