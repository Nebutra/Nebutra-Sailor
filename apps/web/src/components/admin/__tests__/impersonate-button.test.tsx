// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "@/test/query-wrapper";

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

/** Open the in-app confirmation and answer it. */
async function answerConfirm(choice: "Start Impersonating" | "Cancel") {
  const dialog = await screen.findByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: choice }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

import { ImpersonateButton } from "../impersonate-button";

describe("ImpersonateButton", () => {
  it("renders an impersonate trigger button", () => {
    render(<ImpersonateButton userId="u_1" userLabel="Alice" />, { wrapper: createQueryWrapper() });
    expect(screen.getByRole("button", { name: /impersonate/i })).toBeTruthy();
  });

  it("asks in an in-app alert dialog and does nothing when cancelled", async () => {
    render(<ImpersonateButton userId="u_1" userLabel="Alice" />, { wrapper: createQueryWrapper() });

    fireEvent.click(screen.getByRole("button", { name: "Impersonate Alice" }));

    expect(await screen.findByRole("alertdialog", { name: "Impersonate Alice" })).toBeTruthy();
    await answerConfirm("Cancel");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to /api/admin/impersonate and refreshes on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    render(<ImpersonateButton userId="u_target" userLabel="Bob" />, {
      wrapper: createQueryWrapper(),
    });
    fireEvent.click(screen.getByRole("button", { name: "Impersonate Bob" }));
    await answerConfirm("Start Impersonating");

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
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Forbidden" }),
    } as Response);

    render(<ImpersonateButton userId="u_target" userLabel="Bob" />, {
      wrapper: createQueryWrapper(),
    });
    fireEvent.click(screen.getByRole("button", { name: "Impersonate Bob" }));
    await answerConfirm("Start Impersonating");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("disables the button while the request is in flight", async () => {
    let resolveFetch: (val: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((res) => {
        resolveFetch = res;
      }),
    );

    render(<ImpersonateButton userId="u_target" userLabel="Bob" />, {
      wrapper: createQueryWrapper(),
    });
    const trigger = screen.getByRole("button", { name: "Impersonate Bob" });
    fireEvent.click(trigger);
    await answerConfirm("Start Impersonating");

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
