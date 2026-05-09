// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  refreshMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buildResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

import { AdminUsersList } from "../admin-users-list";

describe("AdminUsersList", () => {
  it("fetches users on mount and renders rows", async () => {
    fetchMock.mockReturnValue(
      buildResponse({
        users: [
          {
            id: "u_1",
            email: "alice@example.com",
            name: "Alice",
            avatarUrl: null,
            createdAt: "2026-04-01T00:00:00Z",
            activeOrgsCount: 2,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    );

    render(<AdminUsersList />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/users?page=1"),
        expect.any(Object),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeTruthy();
      expect(screen.getByText("Alice")).toBeTruthy();
      expect(screen.getByText("2")).toBeTruthy();
    });
  });

  it("renders an empty state when no users are returned", async () => {
    fetchMock.mockReturnValue(buildResponse({ users: [], total: 0, page: 1, pageSize: 20 }));

    render(<AdminUsersList />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-users-empty")).toBeTruthy();
    });
  });

  it("debounces search queries (no fetch within 300ms of the last keystroke)", async () => {
    fetchMock.mockReturnValue(buildResponse({ users: [], total: 0, page: 1, pageSize: 20 }));

    render(<AdminUsersList />);

    // Wait for initial fetch
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "al" } });
    fireEvent.change(input, { target: { value: "ali" } });

    // Wait for the debounced fetch to fire (300ms + epsilon)
    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][0]).toContain("search=ali");
      },
      { timeout: 1500 },
    );
  });

  it("paginates forward when next button is clicked", async () => {
    fetchMock.mockReturnValue(
      buildResponse({
        users: Array.from({ length: 20 }).map((_, i) => ({
          id: `u_${i}`,
          email: `u${i}@x.com`,
          name: `U${i}`,
          avatarUrl: null,
          createdAt: "2026-01-01T00:00:00Z",
          activeOrgsCount: 0,
        })),
        total: 50,
        page: 1,
        pageSize: 20,
      }),
    );

    render(<AdminUsersList />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toContain("page=2");
    });
  });

  it("renders an error banner when the fetch fails", async () => {
    fetchMock.mockReturnValue(buildResponse({ error: "boom" }, false, 500));

    render(<AdminUsersList />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });
});
