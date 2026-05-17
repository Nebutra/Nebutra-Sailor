import { parsePlayMarkdown } from "../src";

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

process.stdout.write(`${JSON.stringify({ name: play.meta.name, skills: play.requiredSkills })}\n`);
