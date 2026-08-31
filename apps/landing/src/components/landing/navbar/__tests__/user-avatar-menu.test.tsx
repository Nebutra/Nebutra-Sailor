// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { resetPublicMeCache } from "@/lib/public-me";
import { UserAvatarMenu } from "../UserAvatarMenu";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("UserAvatarMenu", () => {
  beforeEach(() => {
    resetPublicMeCache();
    document.cookie = "nebutra_session_hint=; Path=/; Max-Age=0";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    resetPublicMeCache();
    vi.unstubAllGlobals();
  });

  it("asks /api/me/public with credentials even when the apex hint cookie is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "Not authenticated" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    render(<UserAvatarMenu />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/me\/public$/),
      expect.objectContaining({
        credentials: "include",
      }),
    );
    expect(
      screen.queryByRole("button", { name: "nav.avatarMenu.ariaLabel" }),
    ).not.toBeInTheDocument();
  });

  it("renders the signed-in menu after /api/me/public succeeds", async () => {
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

    render(<UserAvatarMenu />);

    expect(
      await screen.findByRole("button", { name: "nav.avatarMenu.ariaLabel" }),
    ).toBeInTheDocument();
    expect(screen.getByText("TL")).toBeInTheDocument();
  });

  it("falls back to initials when the avatar image fails to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          name: "Tseka Luk",
          email: "tseka@nebutra.com",
          avatarUrl: "https://lh3.googleusercontent.com/a/blocked",
          activeOrganization: null,
        }),
      ),
    );

    const { container } = render(<UserAvatarMenu />);

    const photo = await waitFor(() => {
      const node = container.querySelector("img");
      expect(node).toBeTruthy();
      return node as HTMLImageElement;
    });
    fireEvent.error(photo);
    expect(screen.getByText("TL")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
