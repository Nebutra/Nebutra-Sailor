import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FounderCemetery, readFounderCemeteryDebug } from "./index";

let root: string | undefined;
let cemetery: FounderCemetery | undefined;

afterEach(async () => {
  if (cemetery) await cemetery.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  cemetery = undefined;
});

async function open(): Promise<FounderCemetery> {
  root = await mkdtemp(join(tmpdir(), "founder-cemetery-"));
  cemetery = await FounderCemetery.open(root, { tenantId: "tenant_a" });
  return cemetery;
}

describe("founder-cemetery", () => {
  it("starts with pause as the safe default instead of one-click deletion", async () => {
    const runtime = await open();

    const flow = await runtime.startClosingFlow({
      companyId: "loop",
      companyName: "Loop",
      founderIds: ["alice"],
    });

    expect(flow.recommendedMode).toBe("pause");
    expect(flow.availableModes).toEqual(["pause", "archive", "cemetery"]);
    expect(flow.requiresCoolingOff).toBe(true);
  });

  it("extracts evidence-backed lessons and publishes only with consent", async () => {
    const runtime = await open();
    const analysis = await runtime.analyzeDeath({
      companyId: "loop",
      companyName: "Loop",
      timelineSummaries: [
        "Pivoted from devtools to sales without user interviews",
        "Outbound reply rate stayed below 1 percent",
      ],
    });
    const lessons = await runtime.extractLessons(analysis);
    const memorial = await runtime.publishMemorial({
      analysis,
      lessons,
      publishLevel: "community",
      consentSignatures: ["alice"],
    });

    expect(analysis.causes[0]?.category).toBe("pmf");
    expect(lessons[0]?.evidence).toHaveLength(2);
    expect(memorial.path).toBe(`cemetery/${memorial.slug}.json`);
    expect(memorial.coolingOffUntil).toEqual(expect.any(String));
  });

  it("refuses public memorials without explicit consent", async () => {
    const runtime = await open();
    const analysis = await runtime.analyzeDeath({
      companyId: "loop",
      companyName: "Loop",
      timelineSummaries: ["Ran out of runway after failed raise"],
    });

    await expect(
      runtime.publishMemorial({
        analysis,
        lessons: await runtime.extractLessons(analysis),
        publishLevel: "public",
        consentSignatures: [],
      }),
    ).rejects.toMatchObject({
      capability: "founder-cemetery",
      suggestion: expect.stringContaining("consent"),
    });
    await expect(readFounderCemeteryDebug(root)).resolves.toEqual(expect.any(Array));
  });
});
