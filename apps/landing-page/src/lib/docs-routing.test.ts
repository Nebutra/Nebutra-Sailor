import { describe, expect, it } from "vitest";
import { createPublicDocsUrl } from "./docs-links";
import { createDocsRedirectUrl } from "./docs-routing";

function url(path: string): URL {
  return new URL(`https://nebutra.com${path}`);
}

describe("docs URL governance", () => {
  it("keeps public docs links on the nebutra.com product entrypoint", () => {
    expect(createPublicDocsUrl()).toBe("https://nebutra.com/docs");
    expect(createPublicDocsUrl("guides/multi-tenancy")).toBe(
      "https://nebutra.com/docs/guides/multi-tenancy",
    );
    expect(createPublicDocsUrl("/docs/payments/overview")).toBe(
      "https://nebutra.com/docs/payments/overview",
    );
  });

  it("redirects the public docs entrypoint to the docs app root", () => {
    expect(createDocsRedirectUrl(url("/docs"), "nebutra.com")?.toString()).toBe(
      "https://docs.nebutra.com/",
    );
    expect(
      createDocsRedirectUrl(
        url("/docs/getting-started/installation?utm=npm"),
        "nebutra.com",
      )?.toString(),
    ).toBe("https://docs.nebutra.com/getting-started/installation?utm=npm");
  });

  it("preserves supported docs locales and falls unsupported landing locales back to English", () => {
    expect(
      createDocsRedirectUrl(url("/zh/docs/cli/create-sailor"), "nebutra.com")?.toString(),
    ).toBe("https://docs.nebutra.com/zh/cli/create-sailor");
    expect(
      createDocsRedirectUrl(url("/de/docs/cli/create-sailor"), "nebutra.com")?.toString(),
    ).toBe("https://docs.nebutra.com/cli/create-sailor");
  });

  it("does not redirect non-docs paths or the docs app host", () => {
    expect(createDocsRedirectUrl(url("/features"), "nebutra.com")).toBeNull();
    expect(
      createDocsRedirectUrl(new URL("https://docs.nebutra.com/docs"), "docs.nebutra.com"),
    ).toBe(null);
  });
});
