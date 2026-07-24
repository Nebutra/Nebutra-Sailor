// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const startMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn());
const ssoState = vi.hoisted(() => ({
  error: null as unknown | null,
  isReady: true,
  isStarting: false,
}));

vi.mock("@nebutra/auth/react/clerk-enterprise-sso", () => ({
  getClerkSsoErrorMessage: (error: unknown) => {
    if (!error || typeof error !== "object") return null;
    if ("message" in error && typeof error.message === "string") return error.message;
    if ("errors" in error && Array.isArray(error.errors)) {
      const first = error.errors.find(
        (entry: unknown): entry is { message: string } =>
          Boolean(entry) &&
          typeof entry === "object" &&
          entry !== null &&
          "message" in entry &&
          typeof (entry as { message: unknown }).message === "string",
      );
      return first?.message ?? null;
    }
    return null;
  },
  useClerkEnterpriseSso: () => ({
    isReady: ssoState.isReady,
    isStarting: ssoState.isStarting,
    error: ssoState.error,
    start: startMock,
    retry: retryMock,
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
    ssoState.error = null;
    ssoState.isReady = true;
    ssoState.isStarting = false;
    startMock.mockReset();
    retryMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading status while the package hook handles SSO kickoff", () => {
    render(
      <ClerkEnterpriseSsoHandoff
        identifier="owner@nebutra.com"
        providerName="Nebutra Entra ID"
        returnUrl="/dashboard"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Redirecting...");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Continue with Enterprise SSO",
    );
  });

  it("surfaces package-hook errors and wires retry", async () => {
    const user = userEvent.setup();
    ssoState.error = { errors: [{ message: "Connection disabled" }] };

    render(
      <ClerkEnterpriseSsoHandoff identifier="owner@nebutra.com" providerName="Nebutra Entra ID" />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Connection disabled");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(retryMock).toHaveBeenCalledTimes(1);
    });
  });
});
