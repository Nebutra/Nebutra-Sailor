// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.security.passkeys.title": "Passkeys",
  "auth.security.passkeys.description":
    "Use device-bound credentials for phishing-resistant sign-in.",
  "auth.security.passkeys.empty": "No passkeys registered yet",
  "auth.security.passkeys.addPasskey": "Add passkey",
  "auth.security.passkeys.cancelAdd": "Cancel",
  "auth.security.passkeys.defaultName": "Passkey {number}",
  "auth.security.passkeys.nameHelp":
    "Give this passkey a recognizable name before your browser asks for confirmation.",
  "auth.security.passkeys.nameLabel": "Passkey name",
  "auth.security.passkeys.rename": "Rename",
  "auth.security.passkeys.saveRename": "Save name",
  "auth.security.passkeys.remove": "Remove",
  "auth.security.passkeys.successAdded": "Passkey added.",
  "auth.security.passkeys.successRemoved": "Passkey removed.",
  "auth.security.passkeys.cancelled": "Passkey setup was cancelled. Nothing changed.",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
  "auth.errors.unknown": "Something went wrong. Please try again.",
};

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) => (key: string, values?: Record<string, string | number>) => {
      const fullKey = `${namespace}.${key}`;
      const template = messages[fullKey] ?? fullKey;
      return Object.entries(values ?? {}).reduce(
        (message, [name, value]) => message.replace(`{${name}}`, String(value)),
        template,
      );
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

import { type PasskeyRecord, PasskeysBlock } from "../passkeys-block";
import type { SecurityCapabilities } from "../security-capabilities";

function buildCapability(
  overrides: Partial<SecurityCapabilities["passkeys"]> = {},
): SecurityCapabilities["passkeys"] {
  return {
    available: true,
    reason: "Passkey registration is available.",
    ...overrides,
  };
}

const SAMPLE_PASSKEYS: PasskeyRecord[] = [
  {
    id: "pk_1",
    name: "MacBook Pro",
    deviceType: "platform",
    createdAt: "2025-01-01T12:00:00.000Z",
  },
  {
    id: "pk_2",
    name: "YubiKey 5",
    deviceType: "cross-platform",
    createdAt: "2025-02-15T08:30:00.000Z",
  },
];

describe("PasskeysBlock", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the unavailable stub when capability.available is false", () => {
    render(
      <PasskeysBlock capability={buildCapability({ available: false, reason: "Not wired." })} />,
    );

    expect(screen.getByText("Not wired.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add passkey/ })).not.toBeInTheDocument();
  });

  it("renders empty state when no passkeys registered", async () => {
    const onList = vi.fn().mockResolvedValue([]);
    render(<PasskeysBlock capability={buildCapability()} onList={onList} />);

    await waitFor(() => {
      expect(screen.getByText("No passkeys registered yet")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Add passkey/ })).toBeInTheDocument();
  });

  it("renders the list of registered passkeys", async () => {
    const onList = vi.fn().mockResolvedValue(SAMPLE_PASSKEYS);
    render(<PasskeysBlock capability={buildCapability()} onList={onList} />);

    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });
    expect(screen.getByText("YubiKey 5")).toBeInTheDocument();
  });

  it("calls onAdd when Add passkey is clicked, then refreshes list", async () => {
    const user = userEvent.setup();
    const onList = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(SAMPLE_PASSKEYS.slice(0, 1));
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(<PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByText("No passkeys registered yet")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Add passkey/ }));
    await user.click(screen.getByRole("button", { name: /Add passkey/ }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });
  });

  it("calls onRemove when Remove is clicked", async () => {
    const user = userEvent.setup();
    const onList = vi.fn().mockResolvedValue(SAMPLE_PASSKEYS);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(<PasskeysBlock capability={buildCapability()} onList={onList} onRemove={onRemove} />);

    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole("button", { name: /Remove/ });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith("pk_1");
    });
  });

  it("displays an error message when onAdd rejects", async () => {
    const user = userEvent.setup();
    const onList = vi.fn().mockResolvedValue([]);
    const onAdd = vi.fn().mockRejectedValue({ code: "UNKNOWN" });

    render(<PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByText("No passkeys registered yet")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Add passkey/ }));
    await user.click(screen.getByRole("button", { name: /Add passkey/ }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
    });
  });

  it("opens add flow with a default recognizable name and cancels without starting registration", async () => {
    const onList = vi.fn().mockResolvedValue(SAMPLE_PASSKEYS);
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(<PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));

    expect(screen.getByLabelText("Passkey name")).toHaveValue("Passkey 3");
    expect(
      screen.getByText(
        "Give this passkey a recognizable name before your browser asks for confirmation.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Passkey name")).not.toBeInTheDocument();
  });

  it("passes the edited passkey name to onAdd", async () => {
    const user = userEvent.setup();
    const onList = vi.fn().mockResolvedValue([]);
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(<PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByText("No passkeys registered yet")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Add passkey" }));
    await user.clear(screen.getByLabelText("Passkey name"));
    await user.type(screen.getByLabelText("Passkey name"), "Office YubiKey");
    await user.click(screen.getByRole("button", { name: "Add passkey" }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({ name: "Office YubiKey" });
    });
  });

  it("treats browser passkey cancellation as a non-error status", async () => {
    const user = userEvent.setup();
    const onList = vi.fn().mockResolvedValue([]);
    const onAdd = vi.fn().mockRejectedValue({ code: "CANCELLED" });

    render(<PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByText("No passkeys registered yet")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Add passkey" }));
    await user.click(screen.getByRole("button", { name: "Add passkey" }));

    await waitFor(() => {
      expect(screen.getByText("Passkey setup was cancelled. Nothing changed.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Something went wrong. Please try again.")).not.toBeInTheDocument();
  });

  it("renames an existing passkey without removing it", async () => {
    const user = userEvent.setup();
    const onList = vi.fn().mockResolvedValue(SAMPLE_PASSKEYS);
    const onRename = vi.fn().mockResolvedValue(undefined);

    render(<PasskeysBlock capability={buildCapability()} onList={onList} onRename={onRename} />);

    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    await user.clear(screen.getByLabelText("Passkey name"));
    await user.type(screen.getByLabelText("Passkey name"), "Personal MacBook");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith("pk_1", "Personal MacBook");
    });
  });
});
