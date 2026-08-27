import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/llms.txt", () => {
  it("lists the public Forge surfaces", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toContain("Forge");
    expect(body).toContain(`${getBrandOrigin("forge")}/`);
    expect(body).toContain("/api/tools.json");
  });
});
