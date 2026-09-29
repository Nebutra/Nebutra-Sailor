import { describe, expect, it } from "vitest";
import { studioPresetRoutes } from "./presets";

describe("studio presets", () => {
  it("asks for sign-in before listing, saving or deleting", async () => {
    // No Bearer and no cookie: the auth center is never asked, the caller is nobody.
    expect((await studioPresetRoutes.request("/presets")).status).toBe(401);
    const save = await studioPresetRoutes.request("/presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "linear" }),
    });
    expect(save.status).toBe(401);
    expect((await studioPresetRoutes.request("/presets/x", { method: "DELETE" })).status).toBe(401);
  });
});
