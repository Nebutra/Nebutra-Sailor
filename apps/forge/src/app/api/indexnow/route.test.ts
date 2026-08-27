import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalKey = process.env.INDEXNOW_KEY;

afterEach(() => {
  process.env.INDEXNOW_KEY = originalKey;
});

describe("POST /api/indexnow", () => {
  it("dry-runs when the key is missing", async () => {
    delete process.env.INDEXNOW_KEY;
    const res = await POST(
      new Request("http://localhost/api/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlList: ["https://forge.nebutra.com/"] }),
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      skipped: true,
      count: 1,
    });
  });

  it("rejects invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/indexnow", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
