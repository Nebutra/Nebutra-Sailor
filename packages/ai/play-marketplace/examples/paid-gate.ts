import { PlayMarketplace } from "../src/index";

const skillMarkdown = `---
name: paid_demo
kind: play
version: 1.0.0
description: Paid demo play
required_skills: []
sub_agents: []
---

## What this play does

Demonstrates the paid publish gate.`;

const marketplace = await PlayMarketplace.open(".nebutra/play-marketplace-paid-gate-example", {
  tenantId: "local",
});

try {
  await marketplace.publish({
    skillMarkdown,
    visibility: "public",
    pricing: { model: "subscription", amountUsd: 29, interval: "month" },
    invitedAuthor: false,
  });
} catch (error) {
  process.stdout.write(`${JSON.stringify(error, null, 2)}\n`);
} finally {
  await marketplace.close();
}
