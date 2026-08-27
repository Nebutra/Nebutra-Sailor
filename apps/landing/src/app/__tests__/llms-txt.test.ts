import { describe, expect, it } from "vitest";
import { GET } from "../llms.txt/route";

describe("/llms.txt (G16)", () => {
  it("returns plain-text product map with docs links", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toContain("# Nebutra");
    expect(body).toContain("/features");
    expect(body).toContain("llms.txt");
    expect(body).toContain("Citation");
    expect(body).toContain("https://forge.nebutra.com/");
  });
});
