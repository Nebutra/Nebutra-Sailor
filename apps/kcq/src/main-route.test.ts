import { describe, expect, it } from "vitest";
import { getKcqRoute } from "./main-route";

describe("getKcqRoute", () => {
  it("keeps the profile route separate from the chart runtime", () => {
    expect(getKcqRoute("/settings/profile")).toBe("profile");
    expect(getKcqRoute("/settings/profile/")).toBe("profile");
  });

  it("uses the workbench for chart paths", () => {
    expect(getKcqRoute("/")).toBe("workbench");
    expect(getKcqRoute("/watchlist")).toBe("workbench");
  });
});
