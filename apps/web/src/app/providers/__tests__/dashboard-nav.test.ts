import { describe, expect, it, vi } from "vitest";
import { buildBreadcrumbs, getDashboardNavItems } from "../dashboard-nav";

vi.mock("@nebutra/i18n/routing", () => ({
  routing: {
    locales: ["en", "zh"],
  },
}));

describe("dashboard navigation capabilities", () => {
  it("keeps Startup OS in the base dashboard nav", () => {
    expect(getDashboardNavItems().map((item) => item.href)).toContain("/startup-os");
    expect(buildBreadcrumbs("/startup-os").at(-1)).toEqual({
      href: "/startup-os",
      label: "Startup OS",
    });
  });

  it("hides Startup OS only when the server capability explicitly disables it", () => {
    const capabilities = { startupAgentOS: false };

    expect(getDashboardNavItems(capabilities).map((item) => item.href)).not.toContain(
      "/startup-os",
    );
    expect(buildBreadcrumbs("/startup-os", capabilities).at(-1)).toEqual({
      href: "/startup-os",
      label: "Startup Os",
    });
  });
});
