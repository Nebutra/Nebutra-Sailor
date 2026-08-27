import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CofounderMatch, readCofounderMatchDebug } from "./index";

let root: string | undefined;
let matcher: CofounderMatch | undefined;

afterEach(async () => {
  if (matcher) await matcher.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  matcher = undefined;
});

async function open(): Promise<CofounderMatch> {
  root = await mkdtemp(join(tmpdir(), "cofounder-match-"));
  matcher = await CofounderMatch.open(root, { tenantId: "tenant_a" });
  return matcher;
}

describe("cofounder-match", () => {
  it("requires real activity before a founder can enter matching", async () => {
    const runtime = await open();

    const profile = await runtime.buildProfileFromActivity({
      founderId: "alice",
      activeDays: 12,
      playCounts: { code: 12, growth: 0, brand: 3, support: 0 },
      domainTags: ["developer-tools"],
      communicationSamples: ["direct and technical"],
    });

    expect(profile.activityVerified).toBe(false);
    expect(profile.lockedReason).toContain("30 days");
  });

  it("scores complementary founders with a transparent why explanation", async () => {
    const runtime = await open();
    const builder = await runtime.buildProfileFromActivity({
      founderId: "alice",
      activeDays: 45,
      playCounts: { code: 120, growth: 4, brand: 12, support: 3 },
      domainTags: ["developer-tools", "debugging"],
      communicationSamples: ["short technical updates"],
    });
    const seller = await runtime.buildProfileFromActivity({
      founderId: "sarah",
      activeDays: 60,
      playCounts: { code: 3, growth: 90, brand: 6, support: 18 },
      domainTags: ["developer-tools", "sales"],
      communicationSamples: ["warm customer notes"],
    });

    const score = runtime.scoreMatch(builder, seller);

    expect(builder.activityVerified).toBe(true);
    expect(score.overall).toBeGreaterThan(70);
    expect(score.why.some((reason) => reason.includes("Growth"))).toBe(true);
  });

  it("opens chat only after mutual consent", async () => {
    const runtime = await open();

    await runtime.expressInterest("alice", "sarah");
    await expect(runtime.startChat("alice", "sarah")).rejects.toMatchObject({
      capability: "cofounder-match",
      suggestion: expect.stringContaining("mutual"),
    });
    await runtime.expressInterest("sarah", "alice");
    const chat = await runtime.startChat("alice", "sarah");

    expect(chat.threadKind).toBe("mutual-consent-intro");
    expect(chat.icebreaker).toContain("alice");
    await expect(readCofounderMatchDebug(root)).resolves.toEqual(expect.any(Array));
  });
});
