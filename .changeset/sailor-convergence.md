---
"create-sailor": major
"nebutra": minor
---

One stack, zero questions (ADR 2026-09-24 Sailor convergence).

`create-sailor` no longer asks anything but where to put the project. All stack
flags (`--region`, `--auth`, `--payment`, `--email`, `--storage`, `--queue`,
`--search`, `--deploy`, …) are removed; every project is the same converged
stack and each capability goes live when its key is set. Projects now ship a
portable `Dockerfile.web` + `docker-compose.yml` instead of a platform choice.

`nebutra` drops `create`, `add`, `auth`, `billing`, `search`, `workflow`,
`backend`, `admin`, `community`, `growth`, `stats` and `ecosystem`, and adds
`nebutra status [--json]` — what is live, what each capability still needs.
