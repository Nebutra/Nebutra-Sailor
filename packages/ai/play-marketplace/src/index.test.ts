import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PlayMarketplace, readPlayMarketplaceDebug, validatePlayPackage } from "./index";

let root: string | undefined;
let marketplace: PlayMarketplace | undefined;

const skillMarkdown = [
  "---",
  "name: cold_email_pro",
  "kind: play",
  "version: 1.0.0",
  "description: Cold email campaign play",
  "required_skills:",
  "  - content_store.write",
  "sub_agents:",
  "  - role: writer",
  "    allowed_skills: [content_store.write]",
  "---",
  "",
  "## What this play does",
  "",
  "Builds a reviewed campaign draft.",
].join("\n");

afterEach(async () => {
  if (marketplace) await marketplace.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  marketplace = undefined;
});

async function open(): Promise<PlayMarketplace> {
  root = await mkdtemp(join(tmpdir(), "play-marketplace-"));
  marketplace = await PlayMarketplace.open(root, { tenantId: "tenant_a" });
  return marketplace;
}

describe("play-marketplace", () => {
  it("validates Plays through play-loader instead of local YAML parsing", () => {
    const report = validatePlayPackage({ skillMarkdown });

    expect(report.ok).toBe(true);
    expect(report.playName).toBe("cold_email_pro");
    expect(report.requiredSkills).toContain("content_store.write");
  });

  it("publishes, searches, and installs signed Play registry records", async () => {
    const runtime = await open();
    const published = await runtime.publish({
      skillMarkdown,
      visibility: "public",
      pricing: { model: "free" },
      invitedAuthor: true,
    });
    const results = await runtime.search({ query: "email", sort: "success_rate" });
    const install = await runtime.install(published.playId, "1.0.0");

    expect(published.registryPath).toBe(`marketplace/plays/${published.playId}@1.0.0.json`);
    expect(published.quality.verified).toBe(false);
    expect(results.items.map((item) => item.playId)).toContain(published.playId);
    expect(install.status).toBe("installed");
    expect(install.registeredSkill).toBe("cold_email_pro");
  });

  it("blocks uninvited paid publishing during controlled marketplace launch", async () => {
    const runtime = await open();

    await expect(
      runtime.publish({
        skillMarkdown,
        visibility: "public",
        pricing: { model: "subscription", amountUsd: 29, interval: "month" },
        invitedAuthor: false,
      }),
    ).rejects.toMatchObject({
      capability: "play-marketplace",
      suggestion: expect.stringContaining("invited"),
    });
    await expect(readPlayMarketplaceDebug(root)).resolves.toEqual(expect.any(Array));
  });
});
