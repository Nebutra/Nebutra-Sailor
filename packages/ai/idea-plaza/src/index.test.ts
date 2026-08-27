import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { IdeaPlaza, readIdeaPlazaDebug, scanForSensitiveFields } from "./index";

let root: string | undefined;
let plaza: IdeaPlaza | undefined;

afterEach(async () => {
  if (plaza) await plaza.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  plaza = undefined;
});

async function open(): Promise<IdeaPlaza> {
  root = await mkdtemp(join(tmpdir(), "idea-plaza-"));
  plaza = await IdeaPlaza.open(root, { tenantId: "tenant_a" });
  return plaza;
}

describe("idea-plaza", () => {
  it("blocks opt-in publish when sensitive data is not explicitly redacted", async () => {
    const runtime = await open();

    await expect(
      runtime.publish({
        title: "Loop",
        oneLine: "AI debugging",
        level: "detail",
        body: "Contact alice@example.com with api key sk-test-1234567890",
        tags: ["debugging"],
      }),
    ).rejects.toMatchObject({
      capability: "idea-plaza",
      suggestion: expect.stringContaining("redact"),
    });
  });

  it("publishes explicit snapshots and preserves fork attribution", async () => {
    const runtime = await open();
    const published = await runtime.publish({
      title: "Loop",
      oneLine: "AI debugging",
      level: "cloneable",
      body: "Developer tool for stack trace conversations.",
      tags: ["debugging", "developer-tools"],
      redactions: ["customers", "finances"],
      cemeteryWarnings: [{ title: "DebugMate", cause: "no PMF" }],
    });

    const fork = await runtime.fork(published.ideaId, {
      newFounderId: "bob",
      inheritPlayPreferences: true,
    });
    const feed = await runtime.feed({ sort: "hot", limit: 10 });

    expect(published.publicationPath).toBe(`plaza/ideas/${published.ideaId}.json`);
    expect(published.cemeteryWarnings).toHaveLength(1);
    expect(fork.attribution.publicLineage).toBe(true);
    expect(fork.sourceIdeaId).toBe(published.ideaId);
    expect(feed.items.map((item) => item.ideaId)).toContain(published.ideaId);
  });

  it("keeps PII detection deterministic and auditable", async () => {
    expect(scanForSensitiveFields("email me at a@example.com")).toEqual([
      { kind: "email", value: "a@example.com" },
    ]);
    await open();
    await expect(readIdeaPlazaDebug(root)).resolves.toEqual(expect.any(Array));
  });
});
