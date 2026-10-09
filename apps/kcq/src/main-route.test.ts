import { describe, expect, it } from "vitest";
import { APP_PATH, getKcqRoute } from "./main-route";

describe("getKcqRoute", () => {
  it("keeps the profile route separate from the chart runtime", () => {
    expect(getKcqRoute("/settings/profile")).toBe("profile");
    expect(getKcqRoute("/settings/profile/")).toBe("profile");
  });

  it("sends the bare origin to the workbench path", () => {
    expect(getKcqRoute("/")).toBe("root");
    expect(getKcqRoute("")).toBe("root");
    expect(APP_PATH).toBe("/app");
  });

  it("uses the workbench for app paths", () => {
    expect(getKcqRoute("/app")).toBe("workbench");
    expect(getKcqRoute("/app/")).toBe("workbench");
    expect(getKcqRoute("/app/watchlist")).toBe("workbench");
  });
});
