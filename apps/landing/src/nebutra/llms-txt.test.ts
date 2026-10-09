import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { describe, expect, it } from "vitest";
import { GET } from "../app/llms.txt/route";

describe("instance /llms.txt product map", () => {
  it("publishes product capabilities, documentation and citation policy", async () => {
    const body = await (await GET()).text();
    expect(body).toContain("/features");
    expect(body).toContain("llms.txt");
    expect(body).toContain("Citation");
    expect(body).toContain(`${getBrandOrigin("forge")}/`);
  });
});
