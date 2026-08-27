// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  debug: vi.fn(),
}));

const useAuthMock = vi.hoisted(() => vi.fn());

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: { id: string; email: string; name: string } | null;
  organization: { id: string; name: string; slug: string } | null;
  membership: { role: string } | null;
  provider: string;
};

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@nebutra/auth/client", () => ({
  useAuth: () => useAuthMock(),
}));

async function renderProvider() {
  const { PostHogProvider } = await import("../PostHogProvider");
  render(
    <PostHogProvider>
      <div>child</div>
    </PostHogProvider>,
  );
}

describe("PostHogProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://posthog.example");
    posthogMock.init.mockClear();
    posthogMock.identify.mockClear();
    posthogMock.reset.mockClear();
    posthogMock.debug.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("identifies a signed-in user with organization context", async () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user_1", email: "ada@example.com", name: "Ada" },
      organization: { id: "org_1", name: "Acme", slug: "acme" },
      membership: { role: "admin" },
      provider: "better-auth",
    });

    await renderProvider();

    await waitFor(() => {
      expect(posthogMock.identify).toHaveBeenCalledWith("user_1", {
        email: "ada@example.com",
        name: "Ada",
        organizationId: "org_1",
        organizationSlug: "acme",
        role: "admin",
        authProvider: "better-auth",
      });
    });
  });

  it("does not reset anonymous visitors before any identified session", async () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
      organization: null,
      membership: null,
      provider: "better-auth",
    });

    await renderProvider();

    expect(posthogMock.reset).not.toHaveBeenCalled();
  });

  it("resets PostHog identity after an identified user signs out", async () => {
    let authState: AuthState = {
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user_1", email: "ada@example.com", name: "Ada" },
      organization: null,
      membership: null,
      provider: "better-auth",
    };
    useAuthMock.mockImplementation(() => authState);

    const { PostHogProvider } = await import("../PostHogProvider");
    const view = render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    await waitFor(() => {
      expect(posthogMock.identify).toHaveBeenCalledWith(
        "user_1",
        expect.objectContaining({ email: "ada@example.com" }),
      );
    });

    authState = {
      isLoaded: true,
      isSignedIn: false,
      user: null,
      organization: null,
      membership: null,
      provider: "better-auth",
    };
    view.rerender(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    await waitFor(() => {
      expect(posthogMock.reset).toHaveBeenCalledOnce();
    });
  });
});
