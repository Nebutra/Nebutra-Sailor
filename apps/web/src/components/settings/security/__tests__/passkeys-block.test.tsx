// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode } from "react";
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
  useFormatter: () => ({
    relativeTime: (_d: Date) => "just now",
    dateTime: (_d: Date, _opts?: unknown) => "Jan 1, 2026",
  }),
}));

vi.mock("@nebutra/ui/primitives", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant: _variant,
    ...rest
  }: {
    children?: ReactNode;
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
    disabled?: boolean;
    type?: string;
    variant?: string;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

import { type PasskeyRecord, PasskeysBlock } from "../passkeys-block";
import type { SecurityCapabilities } from "../security-capabilities";

/** Fresh per-test client: retries off (so error/empty states surface
 *  deterministically) and staleTime 0 (so invalidations refetch). */
function makeTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithClient(ui: ReactElement) {
  const client = makeTestClient();
  const utils = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { client, ...utils };
}

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

describe("PasskeysBlock (react-query integration)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the unavailable stub when capability.available is false (query never runs)", () => {
    const onList = vi.fn();
    renderWithClient(
      <PasskeysBlock
        capability={buildCapability({ available: false, reason: "Not wired." })}
        onList={onList}
      />,
    );

    expect(screen.getByText("Not wired.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add passkey/ })).not.toBeInTheDocument();
    // `enabled: capability.available` gates the fetch — it must never fire.
    expect(onList).not.toHaveBeenCalled();
  });

  it("transitions loading → empty: shows the empty state once the list resolves to []", async () => {
    const onList = vi.fn().mockResolvedValue([]);
    renderWithClient(<PasskeysBlock capability={buildCapability()} onList={onList} />);

    // Before the query settles the empty-state copy is not yet shown (isPending).
    expect(screen.queryByText("No passkeys registered yet")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No passkeys registered yet")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Add passkey/ })).toBeInTheDocument();
  });

  it("transitions loading → data: renders the list of registered passkeys", async () => {
    const onList = vi.fn().mockResolvedValue(SAMPLE_PASSKEYS);
    renderWithClient(<PasskeysBlock capability={buildCapability()} onList={onList} />);

    expect(screen.queryByText("MacBook Pro")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });
    expect(screen.getByText("YubiKey 5")).toBeInTheDocument();
  });

  it("renders the error state when the list fetch fails", async () => {
    const onList = vi.fn().mockRejectedValue({ code: "NETWORK_ERROR" });
    renderWithClient(<PasskeysBlock capability={buildCapability()} onList={onList} />);

    await waitFor(() => {
      expect(
        screen.getByText("Network error. Check your connection and try again."),
      ).toBeInTheDocument();
    });
  });

  it("calls onAdd when Add passkey is clicked, then invalidates + refetches the list", async () => {
    const user = userEvent.setup();
    const onList = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(SAMPLE_PASSKEYS.slice(0, 1));
    const onAdd = vi.fn().mockResolvedValue(undefined);

    renderWithClient(
      <PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />,
    );

    await waitFor(() => {
      expect(screen.getByText("No passkeys registered yet")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Add passkey/ }));
    await user.click(screen.getByRole("button", { name: /Add passkey/ }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalled();
    });
    // onSettled invalidation triggers the second onList → the new key appears.
    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });
    expect(onList).toHaveBeenCalledTimes(2);
  });

  it("calls onRemove when Remove is clicked", async () => {
    const user = userEvent.setup();
    const onList = vi.fn().mockResolvedValue(SAMPLE_PASSKEYS);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    renderWithClient(
      <PasskeysBlock capability={buildCapability()} onList={onList} onRemove={onRemove} />,
    );

    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole("button", { name: /Remove/ });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith("pk_1");
    });
  });

  it("optimistically removes a passkey, then rolls back when onRemove rejects", async () => {
    const user = userEvent.setup();
    const onList = vi.fn().mockResolvedValue(SAMPLE_PASSKEYS);
    // Delay the rejection so the optimistic-removed window stays observable
    // before onError rolls the row back.
    const onRemove = vi.fn().mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          setTimeout(() => reject({ code: "NETWORK_ERROR" }), 60);
        }),
    );

    renderWithClient(
      <PasskeysBlock capability={buildCapability()} onList={onList} onRemove={onRemove} />,
    );

    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: /Remove/ })[0]);

    // Optimistic update removes the row immediately.
    await waitFor(() => {
      expect(screen.queryByText("MacBook Pro")).not.toBeInTheDocument();
    });

    // onError rollback (and onSettled refetch) restores the row.
    await waitFor(() => {
      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    });
    expect(onRemove).toHaveBeenCalledWith("pk_1");
  });

  it("displays an error message when onAdd rejects", async () => {
    const user = userEvent.setup();
    const onList = vi.fn().mockResolvedValue([]);
    const onAdd = vi.fn().mockRejectedValue({ code: "UNKNOWN" });

    renderWithClient(
      <PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />,
    );

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

    renderWithClient(
      <PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />,
    );

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

    renderWithClient(
      <PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />,
    );

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

    renderWithClient(
      <PasskeysBlock capability={buildCapability()} onList={onList} onAdd={onAdd} />,
    );

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

    renderWithClient(
      <PasskeysBlock capability={buildCapability()} onList={onList} onRename={onRename} />,
    );

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
