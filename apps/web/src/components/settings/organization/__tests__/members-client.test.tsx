// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
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
}));

vi.mock("@nebutra/ui/primitives", () => ({
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

vi.mock("@nebutra/ui/components", () => ({
  AnimateIn: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    htmlType,
    disabled,
    type: _type,
    ...rest
  }: {
    children?: ReactNode;
    onClick?: () => void;
    htmlType?: "button" | "submit";
    type?: string;
    disabled?: boolean;
  }) => (
    <button type={htmlType ?? "button"} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  Input: ({
    onChange,
    value,
    name,
    type,
    ...rest
  }: {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    value?: string;
    name?: string;
    type?: string;
  }) => (
    <input type={type ?? "text"} name={name} value={value ?? ""} onChange={onChange} {...rest} />
  ),
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

beforeEach(() => {
  global.fetch = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (url === "/api/organizations/org_1/members" && method === "GET") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            currentUserId: "u_owner",
            canManageRoles: true,
            canRemoveMembers: true,
            members: sampleMembers,
          }),
      } as Response);
    }
    if (url === "/api/organizations/org_1/members" && method === "POST") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response);
    }
    if (url.startsWith("/api/organizations/org_1/members/") && method === "DELETE") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response);
    }
    if (url.startsWith("/api/organizations/org_1/members/") && method === "PATCH") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response);
    }
    return Promise.reject(new Error(`unexpected: ${method} ${url}`));
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MembersClient", () => {
  it("renders heading + invite button + a table with the org members", async () => {
    render(<MembersClient orgId="org_1" />);

    expect(screen.getByRole("heading", { level: 1, name: "Members" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite member" })).toBeInTheDocument();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Member" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Joined" })).toBeInTheDocument();
  });

  it("opens the invite dialog and posts the form to the members endpoint", async () => {
    const user = userEvent.setup();
    render(<MembersClient orgId="org_1" />);
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Invite member" }));
    const dialog = await screen.findByRole("dialog");
    const emailInput = within(dialog).getByLabelText("Email address");
    await user.type(emailInput, "new@acme.test");
    await user.click(within(dialog).getByRole("button", { name: "Send invitation" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/organizations/org_1/members",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("new@acme.test"),
        }),
      );
    });
    expect(await screen.findByText("Invitation sent.")).toBeInTheDocument();
  });

  it("removes a member after confirmation", async () => {
    const user = userEvent.setup();
    render(<MembersClient orgId="org_1" />);
    await screen.findByText("Grace Hopper");

    const removeBtns = screen.getAllByRole("button", { name: /Remove/ });
    // Owner row should not be removable — second row is the member row.
    await user.click(removeBtns[removeBtns.length - 1]);

    const confirmDialog = await screen.findByRole("dialog");
    await user.click(within(confirmDialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/organizations/org_1/members/m_2",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("changes a member role via the role select", async () => {
    const user = userEvent.setup();
    render(<MembersClient orgId="org_1" />);
    await screen.findByText("Grace Hopper");

    const roleSelect = screen.getByLabelText(/Change role for Grace Hopper/i) as HTMLSelectElement;
    await user.selectOptions(roleSelect, "admin");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/organizations/org_1/members/m_2",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("admin"),
        }),
      );
    });
  });

  it("shows an error state when the member fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "boom" }),
    });

    render(<MembersClient orgId="org_1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load members.");
  });

  it("shows an empty state when the org has no members beyond viewer", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ currentUserId: "u_owner", canManageRoles: true, members: [] }),
      } as Response),
    ) as unknown as typeof fetch;

    render(<MembersClient orgId="org_1" />);
    expect(await screen.findByText("No members yet")).toBeInTheDocument();
  });
});
