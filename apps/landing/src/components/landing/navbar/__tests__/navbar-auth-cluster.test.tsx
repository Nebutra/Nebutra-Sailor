// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetPublicMeCache } from "@/lib/public-me";

expect.extend(matchers);

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock("@nebutra/icons", () => {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => <svg aria-hidden="true" {...props} />;
  return {
    BookOpen: Icon,
    ChevronDown: Icon,
    CreditCard: Icon,
    Logout: Icon,
    SettingsGear: Icon,
    User: Icon,
  };
});

import { NavbarAuthCluster } from "../NavbarAuthCluster";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NavbarAuthCluster", () => {
  beforeEach(() => {
    resetPublicMeCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    resetPublicMeCache();
    vi.unstubAllGlobals();
  });

  it("keeps Sign In / Get Sailed while the session probe is anonymous", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Not authenticated" }, 401)),
    );

    render(<NavbarAuthCluster />);

    expect(screen.getByRole("link", { name: "nav.signIn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "nav.getStarted" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "nav.signIn" })).toBeInTheDocument();
    });
  });

  it("hides Sign In / Get Sailed after the session probe succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          name: "Tseka Luk",
          email: "tseka@nebutra.com",
          avatarUrl: null,
          activeOrganization: { name: "Nebutra", slug: "nebutra" },
        }),
      ),
    );

    render(<NavbarAuthCluster />);

    expect(
      await screen.findByRole("button", { name: "nav.avatarMenu.ariaLabel" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "nav.signIn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "nav.getStarted" })).not.toBeInTheDocument();
  });
});
