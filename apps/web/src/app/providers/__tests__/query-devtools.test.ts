import { describe, expect, it } from "vitest";
import { shouldRenderReactQueryDevtools } from "../../providers";

describe("React Query devtools visibility", () => {
  it("keeps devtools available on normal dashboard routes in development", () => {
    expect(shouldRenderReactQueryDevtools("/zh/workspace", "development")).toBe(true);
  });

  it("hides the floating devtools badge on the Startup OS workbench", () => {
    expect(shouldRenderReactQueryDevtools("/zh/startup-os", "development")).toBe(false);
    expect(shouldRenderReactQueryDevtools("/en/startup-os/project_1", "development")).toBe(false);
  });

  it("does not render devtools in production", () => {
    expect(shouldRenderReactQueryDevtools("/zh/workspace", "production")).toBe(false);
  });
});
