import { PlayMarketplace } from "../src/index";

const skillMarkdown = `---
name: cold_email_pro
kind: play
version: 1.0.0
description: Cold email draft play
required_skills:
  - content_store.write
sub_agents: []
---

## What this play does

Drafts a reviewed campaign.`;

const marketplace = await PlayMarketplace.open(".nebutra/play-marketplace-example", {
  tenantId: "local",
});

try {
  const play = await marketplace.publish({
    skillMarkdown,
    visibility: "public",
    pricing: { model: "free" },
    invitedAuthor: true,
  });
  process.stdout.write(
    `${JSON.stringify(await marketplace.install(play.playId, play.version), null, 2)}\n`,
  );
} finally {
  await marketplace.close();
}
