import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePlayMarkdown } from "@nebutra/play-loader";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildEmailSequence,
  checkEmailCompliance,
  defineIcp,
  OutreachEngine,
  readOutreachEngineDebug,
} from "./index";

let root: string | undefined;
let engine: OutreachEngine | undefined;

afterEach(async () => {
  if (engine) await engine.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  engine = undefined;
});

async function open(): Promise<OutreachEngine> {
  root = await mkdtemp(join(tmpdir(), "outreach-engine-"));
  engine = await OutreachEngine.open(root, { tenantId: "tenant_a" });
  return engine;
}

describe("outreach-engine", () => {
  it("turns fuzzy ICP language into a structured targeting plan", () => {
    const icp = defineIcp("decision makers at mid-size D2C e-commerce companies in the US");

    expect(icp.industries).toContain("e-commerce");
    expect(icp.companySize).toEqual({ min: 50, max: 500 });
    expect(icp.titles).toContain("Head of Growth");
    expect(icp.geo).toContain("US");
  });

  it("builds compliance-gated email variants with unsubscribe requirements", () => {
    const sequence = buildEmailSequence({
      product: "Loop helps indie devs debug production issues",
      sequenceLength: 3,
      brandVoice: ["technical", "warm"],
    });
    const compliance = checkEmailCompliance(sequence[0], {
      physicalAddress: "123 Market St, San Francisco, CA",
      unsubscribeUrl: "https://loop.test/unsubscribe",
      gdprBasis: "legitimate_interest",
    });

    expect(sequence).toHaveLength(3);
    expect(sequence[0]?.body).toContain("unsubscribe");
    expect(compliance.ok).toBe(true);
  });

  it("runs outreach_campaign as a draft with leads, sequence, schedule, and event", async () => {
    const runtime = await open();

    const campaign = await runtime.createCampaign({
      tenantId: "tenant_a",
      icpDescription: "decision makers at mid-size D2C e-commerce companies",
      targetCount: 12,
      product: "Loop helps teams debug production issues",
      sequenceLength: 3,
      sendPerDay: 4,
      senderEmails: ["founder@loop.test"],
      complianceProfile: {
        physicalAddress: "123 Market St, San Francisco, CA",
        unsubscribeUrl: "https://loop.test/unsubscribe",
        gdprBasis: "legitimate_interest",
      },
    });

    expect(campaign.play).toBe("outreach_campaign");
    expect(campaign.status).toBe("draft");
    expect(campaign.leads).toHaveLength(12);
    expect(campaign.sequence).toHaveLength(3);
    expect(campaign.schedule.dailyLimit).toBe(4);
    expect(campaign.compliance.ok).toBe(true);
    expect(campaign.eventId).toEqual(expect.any(String));
    await expect(readOutreachEngineDebug(root)).resolves.toEqual(expect.any(Array));
  });

  it("rejects persistent campaign creation without tenant context", async () => {
    const runtime = await open();

    await expect(
      runtime.createCampaign({
        tenantId: "",
        icpDescription: "SaaS CTOs",
        targetCount: 5,
        product: "Loop",
        sequenceLength: 2,
        sendPerDay: 2,
        senderEmails: ["founder@loop.test"],
        complianceProfile: {
          physicalAddress: "123 Market St",
          unsubscribeUrl: "https://loop.test/unsubscribe",
          gdprBasis: "legitimate_interest",
        },
      }),
    ).rejects.toMatchObject({
      capability: "outreach-engine",
      suggestion: expect.stringContaining("tenantId"),
    });
  });

  it("keeps the outreach campaign as SKILL.md instead of a new workflow format", async () => {
    const skill = await readFile(
      join(process.cwd(), "plays", "outreach_campaign", "SKILL.md"),
      "utf8",
    );
    const play = parsePlayMarkdown(skill);

    expect(play.meta).toMatchObject({ name: "outreach_campaign", kind: "play" });
    expect(play.requiredSkills).toContain("content_store.write");
    expect(play.subAgents.map((agent) => agent.role)).toContain("lead_researcher");
  });
});
