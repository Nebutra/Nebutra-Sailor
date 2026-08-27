---
name: dockerfile-starter
description: Framework-aware multi-stage, non-root Dockerfile with matching .dockerignore and Compose file — no local Docker install
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Framework-aware multi-stage, non-root Dockerfile with matching .dockerignore and Compose file — no local Docker install

中文：按语言/框架生成多阶段、非 root 的 Dockerfile，附 .dockerignore 与 compose；无需本地安装 Docker

## When to use

- Human or agent needs **Dockerfile Starter** (`dev/dockerfile-starter`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.dockerfile_starter`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/dockerfile-starter
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__dockerfile-starter`

## Engine

- **dockerfile-starter** dockerfile syntax 1 · default runtime tags pinned 2026-07
- Upstream: Dockerfile reference (syntax=docker/dockerfile:1) + BuildKit RUN --mount=type=cache

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
