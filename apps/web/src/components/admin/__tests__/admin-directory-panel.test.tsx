// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDirectoryPanel } from "../admin-directory-panel";

const USERS = [
  {
    id: "user_1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    organizationName: "Analytical Engines",
  },
  {
    id: "user_2",
    name: "Grace Hopper",
    email: "grace@example.com",
    organizationName: "Compiler Labs",
  },
];

const ORGANIZATIONS = [
  {
    id: "org_1",
    name: "Analytical Engines",
    slug: "analytical",
    planName: "Pro",
  },
  {
    id: "org_2",
    name: "Compiler Labs",
    slug: "compiler",
    planName: "Free",
  },
];

describe("AdminDirectoryPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders search URL state and edit entry links for users and organizations", () => {
    render(
      <AdminDirectoryPanel
        query="ada"
        page={2}
        users={USERS}
        organizations={ORGANIZATIONS}
        totalUsers={24}
        totalOrganizations={12}
      />,
    );

    expect(screen.getByRole("searchbox", { name: /search users and organizations/i })).toHaveValue(
      "ada",
    );
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();

    const userRow = screen.getByRole("row", { name: /ada lovelace/i });
    expect(within(userRow).getByRole("button", { name: /edit ada lovelace/i })).toBeInTheDocument();
    expect(within(userRow).getByRole("link", { name: /open ada lovelace/i })).toHaveAttribute(
      "href",
      "/admin/users/user_1",
    );

    const orgRow = screen.getByRole("row", { name: /analytical engines/i });
    expect(
      within(orgRow).getByRole("button", { name: /edit analytical engines/i }),
    ).toBeInTheDocument();
    expect(within(orgRow).getByRole("link", { name: /open analytical engines/i })).toHaveAttribute(
      "href",
      "/admin/organizations/org_1",
    );
  });

  it("submits inline user edits to the admin user API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "user_1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminDirectoryPanel
        query=""
        page={1}
        users={USERS}
        organizations={[]}
        totalUsers={2}
        totalOrganizations={0}
      />,
    );

    await user.click(screen.getByRole("button", { name: /edit ada lovelace/i }));
    await user.clear(screen.getByLabelText(/user name/i));
    await user.type(screen.getByLabelText(/user name/i), "Ada King");
    await user.click(screen.getByRole("button", { name: /save user/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/user_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "Ada King",
          email: "ada@example.com",
          emailVerified: false,
        }),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Saved Ada Lovelace.");
  });

  it("preserves q in pagination links and clamps page to at least 1", () => {
    render(
      <AdminDirectoryPanel
        query="enterprise"
        page={0}
        users={USERS}
        organizations={ORGANIZATIONS}
        totalUsers={40}
        totalOrganizations={0}
        pageSize={10}
      />,
    );

    expect(screen.getByRole("link", { name: /next page/i })).toHaveAttribute(
      "href",
      "/admin?q=enterprise&page=2",
    );
    expect(screen.getByText(/page 1 of 4/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /previous page/i })).not.toBeInTheDocument();
  });

  it("preserves page size in search and pagination URL state", () => {
    render(
      <AdminDirectoryPanel
        query="enterprise"
        page={2}
        users={USERS}
        organizations={ORGANIZATIONS}
        totalUsers={60}
        totalOrganizations={0}
        pageSize={25}
      />,
    );

    expect(screen.getByDisplayValue("25")).toHaveAttribute("name", "pageSize");
    expect(screen.getByRole("link", { name: /previous page/i })).toHaveAttribute(
      "href",
      "/admin?q=enterprise&pageSize=25",
    );
    expect(screen.getByRole("link", { name: /next page/i })).toHaveAttribute(
      "href",
      "/admin?q=enterprise&page=3&pageSize=25",
    );
  });

  it("starts an audited impersonation session from user rows", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const assignMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { assign: assignMock });

    render(
      <AdminDirectoryPanel
        query="ada"
        page={1}
        users={USERS}
        organizations={[]}
        totalUsers={2}
        totalOrganizations={0}
      />,
    );

    await user.click(screen.getByRole("button", { name: /impersonate ada lovelace/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/impersonate",
      expect.objectContaining({
        body: JSON.stringify({ userId: "user_1" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    expect(assignMock).toHaveBeenCalledWith("/");
  });

  it("paginates users and organizations as parallel lists instead of summing both totals", () => {
    render(
      <AdminDirectoryPanel
        query="compiler"
        page={4}
        users={[]}
        organizations={ORGANIZATIONS}
        totalUsers={10}
        totalOrganizations={40}
        pageSize={10}
      />,
    );

    expect(screen.getByText(/page 4 of 4/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /previous page/i })).toHaveAttribute(
      "href",
      "/admin?q=compiler&page=3",
    );
    expect(screen.queryByRole("link", { name: /next page/i })).not.toBeInTheDocument();
  });
});
