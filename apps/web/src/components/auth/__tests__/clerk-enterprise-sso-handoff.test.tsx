// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ssoMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: {
      sso: ssoMock,
    },
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "auth.signIn.providerLoading": "Redirecting...",
      "auth.signIn.ssoTitle": "Continue with Enterprise SSO",
      "auth.signIn.ssoDescription": "Redirecting {email} to {provider}.",
      "auth.signIn.ssoError": "Enterprise SSO could not start. Try another method.",
      "auth.signIn.ssoRetry": "Try again",
    };
    const template = messages[`${namespace}.${key}`] ?? `${namespace}.${key}`;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
  },
}));

vi.mock("@nebutra/icons", () => ({
  Key: () => <span aria-hidden />,
}));

vi.mock("@nebutra/ui/primitives", () => ({
  Button: ({
    children,
    type,
    ...props
  }: {
    children?: ReactNode;
    type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) => (
    <button type={type ?? "button"} {...props}>
      {children}
    </button>
  ),
}));

import { ClerkEnterpriseSsoHandoff } from "../clerk-enterprise-sso-handoff";

describe("ClerkEnterpriseSsoHandoff", () => {
  beforeEach(() => {
    ssoMock.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    ssoMock.mockReset();
  });

  it("starts the Clerk Enterprise SSO flow with the discovered identifier", async () => {
    render(
      <ClerkEnterpriseSsoHandoff
        identifier="owner@nebutra.com"
        providerName="Nebutra Entra ID"
        returnUrl="/dashboard"
      />,
    );

    await waitFor(() => {
      expect(ssoMock).toHaveBeenCalledWith({
        identifier: "owner@nebutra.com",
        strategy: "enterprise_sso",
        redirectUrl: "/dashboard",
        redirectCallbackUrl: "/sign-in",
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Redirecting...");
  });

  it("lets the user retry if Clerk rejects the SSO start", async () => {
    const user = userEvent.setup();
    ssoMock.mockResolvedValueOnce({ error: { errors: [{ message: "Connection disabled" }] } });

    render(
      <ClerkEnterpriseSsoHandoff identifier="owner@nebutra.com" providerName="Nebutra Entra ID" />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Connection disabled");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(ssoMock).toHaveBeenCalledTimes(2);
    });
  });
});
