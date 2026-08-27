// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

const fetchMock = vi.fn();
const confirmMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  refreshMock.mockReset();
  confirmMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  globalThis.confirm = confirmMock as unknown as typeof confirm;
});

afterEach(() => {
  vi.restoreAllMocks();
});

import { ImpersonateButton } from "../impersonate-button";

describe("ImpersonateButton", () => {
  it("renders an impersonate trigger button", () => {
    render(<ImpersonateButton userId="u_1" userLabel="Alice" />);
    expect(screen.getByRole("button", { name: /impersonate/i })).toBeTruthy();
  });

  it("does nothing when the user cancels confirm()", () => {
    confirmMock.mockReturnValue(false);
    render(<ImpersonateButton userId="u_1" userLabel="Alice" />);

    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));

    expect(confirmMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to /api/admin/impersonate and refreshes on success", async () => {
    confirmMock.mockReturnValue(true);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    render(<ImpersonateButton userId="u_target" userLabel="Bob" />);
    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/impersonate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "content-type": "application/json" }),
          body: JSON.stringify({ userId: "u_target" }),
        }),
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("renders an error message when impersonation fails", async () => {
    confirmMock.mockReturnValue(true);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Forbidden" }),
    } as Response);

    render(<ImpersonateButton userId="u_target" userLabel="Bob" />);
    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("disables the button while the request is in flight", async () => {
    confirmMock.mockReturnValue(true);
    let resolveFetch: (val: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((res) => {
        resolveFetch = res;
      }),
    );

    render(<ImpersonateButton userId="u_target" userLabel="Bob" />);
    const trigger = screen.getByRole("button", { name: /impersonate/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect((trigger as HTMLButtonElement).disabled).toBe(true);
    });

    resolveFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
