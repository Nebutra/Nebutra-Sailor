// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, params?: Record<string, string | number>) => {
    const base = ns ? `${ns}.${key}` : key;
    if (params && Object.keys(params).length > 0) {
      const tail = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return `${base}(${tail})`;
    }
    return base;
  },
}));

import { EmailChangeForm } from "../email-change-form";

describe("EmailChangeForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders title and submit", () => {
    render(<EmailChangeForm />);
    expect(screen.getByRole("heading").textContent).toBe("account.emailChange.title");
    expect(screen.getByRole("button", { name: "account.emailChange.submit" })).toBeTruthy();
  });

  it("rejects an invalid email at submit", async () => {
    const requestEmailChange = vi.fn();
    render(<EmailChangeForm requestEmailChange={requestEmailChange} />);

    fireEvent.change(screen.getByLabelText(/account\.emailChange\.newEmailLabel/), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "account.emailChange.submit" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("account.emailChange.errorInvalidEmail"),
    );
    expect(requestEmailChange).not.toHaveBeenCalled();
  });

  it("calls requestEmailChange with normalized email and shows verificationSent", async () => {
    const requestEmailChange = vi.fn().mockResolvedValue({ ok: true, verificationSent: true });
    render(<EmailChangeForm requestEmailChange={requestEmailChange} />);

    fireEvent.change(screen.getByLabelText(/account\.emailChange\.newEmailLabel/), {
      target: { value: "  Alice2@Example.com  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "account.emailChange.submit" }));

    await waitFor(() =>
      expect(requestEmailChange).toHaveBeenCalledWith({
        newEmail: "alice2@example.com",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "account.emailChange.verificationSent",
      ),
    );
  });

  it("shows error when API rejects", async () => {
    const requestEmailChange = vi.fn().mockRejectedValue(new Error("EMAIL_TAKEN"));
    render(<EmailChangeForm requestEmailChange={requestEmailChange} />);

    fireEvent.change(screen.getByLabelText(/account\.emailChange\.newEmailLabel/), {
      target: { value: "alice2@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "account.emailChange.submit" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("EMAIL_TAKEN"));
  });
});
