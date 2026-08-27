import { describe, expect, it } from "vitest";
import { createPublicDocsUrl } from "./docs-links";
import { createDocsRedirectUrl } from "./docs-routing";

function url(path: string): URL {
  return new URL(`https://nebutra.com${path}`);
}

describe("docs URL governance", () => {
  it("keeps public docs links on the canonical docs host", () => {
    expect(createPublicDocsUrl()).toBe("https://docs.nebutra.com");
    expect(createPublicDocsUrl("guides/multi-tenancy")).toBe(
      "https://docs.nebutra.com/guides/multi-tenancy",
    );
    expect(createPublicDocsUrl("/docs/payments/overview")).toBe(
      "https://docs.nebutra.com/payments/overview",
    );
  });

  it("redirects the public docs entrypoint to the explicit English docs root", () => {
    // The locale prefix is always emitted so landing never hands the visitor a
    // redirect chain — sailor-docs itself 301s "/" → "/en".
    expect(createDocsRedirectUrl(url("/docs"), "nebutra.com")?.toString()).toBe(
      "https://docs.nebutra.com/en",
    );
    expect(
      createDocsRedirectUrl(
        url("/docs/getting-started/installation?utm=npm"),
        "nebutra.com",
      )?.toString(),
    ).toBe("https://docs.nebutra.com/en/getting-started/installation?utm=npm");
  });

  it("folds both Chinese scripts onto the docs origin's single bilingual locale", () => {
    // The docs origin runs a narrower axis: i18n.languages = ["en", "zh"]
    // (apps/sailor-docs/src/lib/i18n.ts), so zh-Hans and zh-Hant both land on "zh".
    expect(
      createDocsRedirectUrl(url("/zh-Hans/docs/cli/create-sailor"), "nebutra.com")?.toString(),
    ).toBe("https://docs.nebutra.com/zh/cli/create-sailor");
    expect(
      createDocsRedirectUrl(url("/zh-Hant/docs/cli/create-sailor"), "nebutra.com")?.toString(),
    ).toBe("https://docs.nebutra.com/zh/cli/create-sailor");
  });

  it("falls non-content landing locales back to the English docs path", () => {
    expect(
      createDocsRedirectUrl(url("/de/docs/cli/create-sailor"), "nebutra.com")?.toString(),
    ).toBe("https://docs.nebutra.com/en/cli/create-sailor");
    expect(
      createDocsRedirectUrl(url("/en/docs/cli/create-sailor"), "nebutra.com")?.toString(),
    ).toBe("https://docs.nebutra.com/en/cli/create-sailor");
  });

  it("leaves the legacy bare /zh prefix to the proxy's 308", () => {
    // Bare `zh` is not a route locale, so this seam must not claim it — it is
    // redirected to /zh-Hans/docs/... first (see legacyLocalePathRedirect).
    expect(createDocsRedirectUrl(url("/zh/docs/cli/create-sailor"), "nebutra.com")).toBeNull();
  });

  it("does not redirect non-docs paths or the docs app host", () => {
    expect(createDocsRedirectUrl(url("/features"), "nebutra.com")).toBeNull();
    expect(
      createDocsRedirectUrl(new URL("https://docs.nebutra.com/docs"), "docs.nebutra.com"),
    ).toBe(null);
  });
});
