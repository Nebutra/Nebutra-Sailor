// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.security.connectedAccounts.title": "Connected accounts",
  "auth.security.connectedAccounts.description":
    "Review OAuth sign-in methods linked to your Nebutra identity.",
  "auth.security.connectedAccounts.connected": "Connected",
  "auth.security.connectedAccounts.connect": "Connect",
  "auth.security.connectedAccounts.unlink": "Unlink",
  "auth.security.connectedAccounts.notLinked": "Not linked",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
  "auth.errors.unknown": "Something went wrong. Please try again.",
  "auth.errors.providerNotSupported": "This action is managed by your authentication provider.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

vi.mock("@nebutra/ui/components", () => ({
  Button: ({
    children,
    htmlType,
    onClick,
    disabled,
    type: _type,
    variant: _variant,
    ...rest
  }: {
    children?: ReactNode;
    htmlType?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
    disabled?: boolean;
    type?: string;
    variant?: string;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) => (
    <button type={htmlType ?? "button"} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

import { ConnectedAccountsBlock } from "../connected-accounts-block";
import type { SecurityCapabilities } from "../security-capabilities";

function buildCapability(
  overrides: Partial<SecurityCapabilities["connectedAccounts"]> = {},
): SecurityCapabilities["connectedAccounts"] {
  return {
    available: true,
    linkedProviders: [],
    reason: "Linked sign-in methods can be discovered.",
    ...overrides,
  };
}

describe("ConnectedAccountsBlock", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders all 5 OAuth providers", () => {
    render(<ConnectedAccountsBlock capability={buildCapability()} />);

    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Microsoft")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
  });

  it("shows Connect button for unlinked providers", () => {
    render(<ConnectedAccountsBlock capability={buildCapability()} />);

    const connectButtons = screen.getAllByRole("button", { name: /^Connect/ });
    expect(connectButtons.length).toBeGreaterThanOrEqual(5);
  });

  it("shows Connected badge + Unlink button for linked providers", () => {
    render(
      <ConnectedAccountsBlock
        capability={buildCapability({ linkedProviders: ["google", "github"] })}
      />,
    );

    expect(screen.getAllByText("Connected").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("button", { name: /Unlink/ }).length).toBeGreaterThanOrEqual(2);
  });

  it("calls onLink with provider id when Connect is clicked", async () => {
    const user = userEvent.setup();
    const onLink = vi.fn().mockResolvedValue(undefined);

    render(<ConnectedAccountsBlock capability={buildCapability()} onLink={onLink} />);

    const googleRow = screen.getByText("Google").closest("div")!;
    const connectBtn = googleRow.parentElement?.querySelector("button");
    await user.click(connectBtn!);

    await waitFor(() => {
      expect(onLink).toHaveBeenCalledWith("google");
    });
  });

  it("calls onUnlink with provider id when Unlink is clicked", async () => {
    const user = userEvent.setup();
    const onUnlink = vi.fn().mockResolvedValue(undefined);

    render(
      <ConnectedAccountsBlock
        capability={buildCapability({ linkedProviders: ["github"] })}
        onUnlink={onUnlink}
      />,
    );

    const unlinkBtn = screen.getByRole("button", { name: /Unlink/ });
    await user.click(unlinkBtn);

    await waitFor(() => {
      expect(onUnlink).toHaveBeenCalledWith("github");
    });
  });

  it("shows skeleton when loading", () => {
    render(<ConnectedAccountsBlock capability={buildCapability()} loading />);

    expect(screen.queryByRole("button", { name: /Connect/ })).not.toBeInTheDocument();
  });

  it("renders the unavailable state when capability.available is false", () => {
    render(
      <ConnectedAccountsBlock
        capability={buildCapability({
          available: false,
          reason: "Linked account management is delegated to clerk.",
        })}
      />,
    );

    expect(
      screen.getByText("Linked account management is delegated to clerk."),
    ).toBeInTheDocument();
  });

  it("displays a localized error when onLink rejects with a known code", async () => {
    const user = userEvent.setup();
    const onLink = vi.fn().mockRejectedValue({ code: "PROVIDER_NOT_SUPPORTED" });

    render(<ConnectedAccountsBlock capability={buildCapability()} onLink={onLink} />);

    const googleRow = screen.getByText("Google").closest("div")!;
    const connectBtn = googleRow.parentElement?.querySelector("button");
    await user.click(connectBtn!);

    await waitFor(() => {
      expect(
        screen.getByText("This action is managed by your authentication provider."),
      ).toBeInTheDocument();
    });
  });
});
