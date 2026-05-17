# play-loader Replication Guide

```ts
import { parsePlayMarkdown } from "@nebutra/play-loader";

const play = parsePlayMarkdown(`---
name: launch_page
kind: play
version: 1.0.0
description: Build a launch page
required_skills: [content_store.write]
sub_agents: []
depends_on_plays: []
---

## What this play does

Create a page from a concise brief.
`);

console.log(play.meta.name);
```

## CLI

```bash
pnpm play:new launch_page
pnpm play:list
pnpm play:test launch_page
```

## Rules

1. Plays are SKILL.md documents with `kind: play`.
2. The loader rejects dependency cycles.
3. Runtime execution belongs to agent-loop, not play-loader.
