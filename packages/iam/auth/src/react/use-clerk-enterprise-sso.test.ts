// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ssoMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => ({
    errors: null,
    fetchStatus: "idle" as const,
    signIn: {
      sso: ssoMock,
    },
  }),
}));

import {
  buildClerkEnterpriseSsoParams,
  CLERK_ENTERPRISE_SSO_STRATEGY,
  DEFAULT_CLERK_ENTERPRISE_SSO_CALLBACK,
  getClerkSsoErrorMessage,
  useClerkEnterpriseSso,
} from "./use-clerk-enterprise-sso";

describe("buildClerkEnterpriseSsoParams", () => {
  it("pins enterprise_sso strategy and default callback", () => {
    expect(buildClerkEnterpriseSsoParams({ identifier: "a@b.com" })).toEqual({
      identifier: "a@b.com",
      strategy: CLERK_ENTERPRISE_SSO_STRATEGY,
      redirectUrl: "/",
      redirectCallbackUrl: DEFAULT_CLERK_ENTERPRISE_SSO_CALLBACK,
    });
    expect(CLERK_ENTERPRISE_SSO_STRATEGY).toBe("enterprise_sso");
    expect(DEFAULT_CLERK_ENTERPRISE_SSO_CALLBACK).toBe("/sign-in");
  });

  it("respects explicit redirect URLs", () => {
    expect(
      buildClerkEnterpriseSsoParams({
        identifier: "a@b.com",
        redirectUrl: "/dashboard",
        redirectCallbackUrl: "/auth/callback",
      }),
    ).toEqual({
      identifier: "a@b.com",
      strategy: "enterprise_sso",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: "/auth/callback",
    });
  });
});

describe("getClerkSsoErrorMessage", () => {
  it("reads top-level and nested Clerk error shapes", () => {
    expect(getClerkSsoErrorMessage({ message: "top" })).toBe("top");
    expect(getClerkSsoErrorMessage({ errors: [{ message: "nested" }] })).toBe("nested");
    expect(getClerkSsoErrorMessage(null)).toBeNull();
  });
});

describe("useClerkEnterpriseSso", () => {
  beforeEach(() => {
    ssoMock.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    ssoMock.mockReset();
  });

  it("auto-starts enterprise SSO with discovered identifier", async () => {
    renderHook(() =>
      useClerkEnterpriseSso({
        identifier: "owner@nebutra.com",
        redirectUrl: "/dashboard",
      }),
    );

    await waitFor(() => {
      expect(ssoMock).toHaveBeenCalledWith({
        identifier: "owner@nebutra.com",
        strategy: "enterprise_sso",
        redirectUrl: "/dashboard",
        redirectCallbackUrl: "/sign-in",
      });
    });
  });

  it("surfaces Clerk rejection and allows retry", async () => {
    ssoMock.mockResolvedValueOnce({ error: { errors: [{ message: "Connection disabled" }] } });

    const { result } = renderHook(() => useClerkEnterpriseSso({ identifier: "owner@nebutra.com" }));

    await waitFor(() => {
      expect(getClerkSsoErrorMessage(result.current.error)).toBe("Connection disabled");
    });

    result.current.retry();

    await waitFor(() => {
      expect(ssoMock).toHaveBeenCalledTimes(2);
    });
  });
});
