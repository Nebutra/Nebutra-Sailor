// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamMemberList } from "./TeamMemberList";

const ORG_ID = "org_123";
const MEMBERS_URL = `/api/organizations/${ORG_ID}/members`;

const ADMIN_MEMBER = {
  id: "m1",
  userId: "u1",
  user: { id: "u1", name: "Ada Admin", email: "ada@example.com", image: null as string | null },
  role: "admin" as const,
  joinedAt: "2026-01-01T00:00:00Z",
};

const VIEWER_MEMBER = {
  id: "m2",
  userId: "u2",
  user: { id: "u2", name: "Vic Viewer", email: "vic@example.com", image: null as string | null },
  role: "viewer" as const,
  joinedAt: "2026-02-01T00:00:00Z",
};

function membersPayload(members = [ADMIN_MEMBER, VIEWER_MEMBER]) {
  return {
    // currentUserId is u1 (Ada) — so Vic is removable by the admin, Ada can leave.
    currentUserId: "u1",
    canManageRoles: true,
    canRemoveMembers: true,
    members,
  };
}

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

describe("TeamMemberList (react-query integration)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("transitions loading → data: shows the spinner then the member list", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === MEMBERS_URL) {
        return Promise.resolve(jsonResponse(membersPayload()));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<TeamMemberList orgId={ORG_ID} />);

    // Loading state appears first (isPending → <LoadingState /> spinner).
    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Ada Admin")).toBeInTheDocument();
    });
    expect(screen.getByText("Vic Viewer")).toBeInTheDocument();
    expect(screen.getByText("2 members")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(MEMBERS_URL, expect.any(Object));
  });

  it("renders the error state when the members fetch fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === MEMBERS_URL) {
        return Promise.resolve(jsonResponse({ error: "Failed to load members" }, { status: 500 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<TeamMemberList orgId={ORG_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load members/i)).toBeInTheDocument();
    });
  });

  it("optimistically removes a member, then rolls back on DELETE failure", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === MEMBERS_URL && (init?.method ?? "GET") === "GET") {
        return Promise.resolve(jsonResponse(membersPayload()));
      }
      if (init?.method === "DELETE") {
        // Delete fails → optimistic removal must roll back. Delay the rejection
        // so the optimistic-removed window stays observable before onError.
        return new Promise<Response>((resolve) => {
          setTimeout(
            () => resolve(jsonResponse({ error: "Failed to remove member" }, { status: 500 })),
            60,
          );
        });
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    renderWithClient(<TeamMemberList orgId={ORG_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Vic Viewer")).toBeInTheDocument();
    });

    // Remove Vic (admin removing another member).
    await user.click(screen.getByRole("button", { name: /Remove Vic Viewer from organization/i }));

    // Optimistic update removes the row immediately.
    await waitFor(() => {
      expect(screen.queryByText("Vic Viewer")).not.toBeInTheDocument();
    });

    // onError rollback (and onSettled refetch) restores the row.
    await waitFor(() => {
      expect(screen.getByText("Vic Viewer")).toBeInTheDocument();
    });

    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === "DELETE",
      ),
    ).toBe(true);
  });
});
