// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
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

import { AdminOrganizationsList } from "../admin-organizations-list";

describe("AdminOrganizationsList", () => {
  it("fetches organizations on mount and renders rows", async () => {
    fetchMock.mockReturnValue(
      buildResponse({
        organizations: [
          {
            id: "org_1",
            name: "Acme",
            slug: "acme",
            plan: "PRO",
            createdAt: "2026-01-01T00:00:00Z",
            memberCount: 12,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    );

    render(<AdminOrganizationsList />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/organizations?page=1"),
        expect.any(Object),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Acme")).toBeTruthy();
      expect(screen.getByText("acme")).toBeTruthy();
      expect(screen.getByText("12")).toBeTruthy();
    });
  });

  it("renders empty state when no orgs are returned", async () => {
    fetchMock.mockReturnValue(
      buildResponse({ organizations: [], total: 0, page: 1, pageSize: 20 }),
    );

    render(<AdminOrganizationsList />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-organizations-empty")).toBeTruthy();
    });
  });

  it("debounces search queries (no fetch within 300ms of the last keystroke)", async () => {
    fetchMock.mockReturnValue(
      buildResponse({ organizations: [], total: 0, page: 1, pageSize: 20 }),
    );

    render(<AdminOrganizationsList />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ac" } });
    fireEvent.change(input, { target: { value: "acm" } });

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][0]).toContain("search=acm");
      },
      { timeout: 1500 },
    );
  });

  it("paginates forward via next button", async () => {
    fetchMock.mockReturnValue(
      buildResponse({
        organizations: [
          {
            id: "org_1",
            name: "Acme",
            slug: "acme",
            plan: "PRO",
            createdAt: "2026-01-01T00:00:00Z",
            memberCount: 1,
          },
        ],
        total: 50,
        page: 1,
        pageSize: 20,
      }),
    );

    render(<AdminOrganizationsList />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toContain("page=2");
    });
  });

  it("renders an error banner on fetch failure", async () => {
    fetchMock.mockReturnValue(buildResponse({ error: "boom" }, false, 500));

    render(<AdminOrganizationsList />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });
});
