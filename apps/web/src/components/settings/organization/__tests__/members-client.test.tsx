// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "settings.organization.members.heading": "Members",
  "settings.organization.members.description":
    "Invite, promote, and remove members of this organization.",
  "settings.organization.members.invite": "Invite member",
  "settings.organization.members.empty": "No members yet",
  "settings.organization.members.loading": "Loading members…",
  "settings.organization.members.errorLoad": "Could not load members.",
  "settings.organization.members.columnMember": "Member",
  "settings.organization.members.columnRole": "Role",
  "settings.organization.members.columnJoined": "Joined",
  "settings.organization.members.columnActions": "Actions",
  "settings.organization.members.role.owner": "Owner",
  "settings.organization.members.role.admin": "Admin",
  "settings.organization.members.role.member": "Member",
  "settings.organization.members.role.viewer": "Viewer",
  "settings.organization.members.remove": "Remove",
  "settings.organization.members.confirmRemove": "Remove this member?",
  "settings.organization.members.confirm": "Confirm",
  "settings.organization.members.cancel": "Cancel",
  "settings.organization.members.changeRole": "Change role",
  "settings.organization.invite.title": "Invite a new member",
  "settings.organization.invite.emailLabel": "Email address",
  "settings.organization.invite.roleLabel": "Role",
  "settings.organization.invite.send": "Send invitation",
  "settings.organization.invite.success": "Invitation sent.",
  "settings.organization.invite.error": "Could not send invitation.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
  useFormatter: () => ({
    relativeTime: (_d: Date) => "just now",
    dateTime: (_d: Date, _opts?: unknown) => "Jan 1, 2026",
  }),
}));

// Partial mock: only the Select family is doubled (Radix's listbox needs a real
// pointer stack jsdom does not provide). Everything else — Table, ConfirmDialog
// — comes from the real library so this suite tracks it instead of drifting.
vi.mock("@nebutra/ui/primitives", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@nebutra/ui/primitives")>()),
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children?: ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => {
    let triggerProps: Record<string, unknown> = {};
    const options: { value: string; label: ReactNode }[] = [];
    const walk = (node: ReactNode) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node !== "object" || !("type" in (node as object))) return;
      const el = node as {
        type: { displayName?: string; name?: string };
        props: Record<string, unknown>;
      };
      const tname =
        (el.type as { displayName?: string; name?: string }).displayName ??
        (el.type as { name?: string }).name;
      if (tname === "SelectTrigger") {
        triggerProps = el.props ?? {};
      } else if (tname === "SelectContent") {
        walk(el.props.children as ReactNode);
      } else if (tname === "SelectItem") {
        options.push({ value: el.props.value as string, label: el.props.children as ReactNode });
      } else if (el.props?.children) {
        walk(el.props.children as ReactNode);
      }
    };
    walk(children);
    return (
      <select
        aria-label={triggerProps["aria-label"] as string}
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {typeof o.label === "string" ? o.label : o.value}
          </option>
        ))}
      </select>
    );
  },
  SelectTrigger: Object.assign(({ children }: { children?: ReactNode }) => <>{children}</>, {
    displayName: "SelectTrigger",
  }),
  SelectContent: Object.assign(({ children }: { children?: ReactNode }) => <>{children}</>, {
    displayName: "SelectContent",
  }),
  SelectItem: Object.assign(
    ({ children }: { children?: ReactNode; value: string }) => <>{children}</>,
    { displayName: "SelectItem" },
  ),
  SelectValue: Object.assign(
    ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    { displayName: "SelectValue" },
  ),
}));

// InviteDialog is a sibling component (own tests). Stub it to a minimal double
// so this suite stays focused on MembersClient: the double posts to the same
// endpoint and fires onSuccess, exercising MembersClient's success/invalidation
// wiring without coupling to react-hook-form internals.
vi.mock("../invite-dialog", () => ({
  InviteDialog: ({
    orgId,
    open,
    onClose,
    onSuccess,
  }: {
    orgId: string;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label="Invite a new member">
        <label htmlFor="invite-email">Email address</label>
        <input id="invite-email" type="email" defaultValue="new@acme.test" />
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            await fetch(`/api/organizations/${orgId}/members`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ email: "new@acme.test", role: "member" }),
            });
            onSuccess();
            onClose();
          }}
        >
          Send invitation
        </button>
      </div>
    );
  },
}));

import { MembersClient } from "../members-client";

const sampleMembers = [
  {
    id: "m_1",
    userId: "u_owner",
    role: "owner",
    joinedAt: "2026-01-01T00:00:00.000Z",
    user: { id: "u_owner", name: "Ada Lovelace", email: "ada@acme.test", image: null },
  },
  {
    id: "m_2",
    userId: "u_member",
    role: "member",
    joinedAt: "2026-02-15T00:00:00.000Z",
    user: { id: "u_member", name: "Grace Hopper", email: "grace@acme.test", image: null },
  },
];

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

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

function membersOk() {
  return jsonResponse({
    currentUserId: "u_owner",
    canManageRoles: true,
    canRemoveMembers: true,
    members: sampleMembers,
  });
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MembersClient (react-query integration)", () => {
  it("transitions loading → data: shows the loading copy then the member table", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations/org_1/members" && method === "GET") {
        return Promise.resolve(membersOk());
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<MembersClient orgId="org_1" />);

    // Loading state appears first (isPending before the query resolves).
    expect(screen.getByText("Loading members…")).toBeInTheDocument();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Loading members…")).not.toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Member" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Joined" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/organizations/org_1/members", expect.any(Object));
  });

  it("renders the error state when the member fetch fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations/org_1/members" && method === "GET") {
        return Promise.resolve(jsonResponse({}, { status: 500 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<MembersClient orgId="org_1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load members.");
  });

  it("shows the empty state when the org has no members", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations/org_1/members" && method === "GET") {
        return Promise.resolve(
          jsonResponse({ currentUserId: "u_owner", canManageRoles: true, members: [] }),
        );
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<MembersClient orgId="org_1" />);
    expect(await screen.findByText("No members yet")).toBeInTheDocument();
  });

  it("changes a member role and invalidates the list (background refetch)", async () => {
    let getCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations/org_1/members" && method === "GET") {
        getCount += 1;
        return Promise.resolve(membersOk());
      }
      if (url === "/api/organizations/org_1/members/m_2" && method === "PATCH") {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<MembersClient orgId="org_1" />);
    await screen.findByText("Grace Hopper");

    const roleSelect = screen.getByLabelText(/Change role for Grace Hopper/i) as HTMLSelectElement;
    await user.selectOptions(roleSelect, "admin");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/organizations/org_1/members/m_2",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("admin"),
        }),
      );
    });

    // onSettled invalidated the list → a second GET fired after the PATCH.
    await waitFor(() => {
      expect(getCount).toBeGreaterThan(1);
    });
  });

  it("optimistically removes a member, then rolls back on DELETE failure", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations/org_1/members" && method === "GET") {
        return Promise.resolve(membersOk());
      }
      if (url === "/api/organizations/org_1/members/m_2" && method === "DELETE") {
        // Delay the rejection so the optimistic-removed window stays observable
        // before onError rolls back.
        return new Promise<Response>((resolve) => {
          setTimeout(() => resolve(jsonResponse({}, { status: 500 })), 60);
        });
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<MembersClient orgId="org_1" />);
    await screen.findByText("Grace Hopper");

    // Owner row is not removable — the only Remove button targets the member row.
    await user.click(screen.getByRole("button", { name: /^Remove Grace Hopper$/ }));

    // ConfirmDialog is an alert dialog — its popup carries role="alertdialog",
    // which byRole does not fold into "dialog".
    const confirmDialog = await screen.findByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: "Confirm" }));

    // Optimistic update removes the row immediately.
    await waitFor(() => {
      expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
    });

    // onError rollback (and onSettled refetch) restores the row.
    await waitFor(() => {
      expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/organizations/org_1/members/m_2",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("opens the invite dialog and posts the form to the members endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations/org_1/members" && method === "GET") {
        return Promise.resolve(membersOk());
      }
      if (url === "/api/organizations/org_1/members" && method === "POST") {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<MembersClient orgId="org_1" />);
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Invite member" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Email address")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Send invitation" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/organizations/org_1/members",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("new@acme.test"),
        }),
      );
    });
    expect(await screen.findByText("Invitation sent.")).toBeInTheDocument();
  });
});
