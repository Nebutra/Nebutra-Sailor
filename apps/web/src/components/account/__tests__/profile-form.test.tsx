// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useUserMock = vi.fn();

vi.mock("@nebutra/auth/client", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
  useLocale: () => "en",
}));

import { ProfileForm } from "../profile-form";

function setUser(user: Partial<{ name: string; email: string; imageUrl: string }> | null) {
  useUserMock.mockReturnValue({
    user: user
      ? { id: "user_1", name: user.name, email: user.email, imageUrl: user.imageUrl }
      : null,
    isLoaded: true,
  });
}

describe("ProfileForm", () => {
  beforeEach(() => {
    useUserMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders pre-filled name and email fields", () => {
    setUser({ name: "Alice", email: "alice@example.com" });
    render(<ProfileForm />);
    const name = screen.getByLabelText(/account\.profile\.nameLabel/) as HTMLInputElement;
    const email = screen.getByLabelText(/account\.profile\.emailLabel/) as HTMLInputElement;
    expect(name.value).toBe("Alice");
    expect(email.value).toBe("alice@example.com");
  });

  it("disables submit until a field changes", () => {
    setUser({ name: "Alice", email: "alice@example.com" });
    render(<ProfileForm />);
    const submit = screen.getByRole("button", { name: /account\.profile\.submit/ });
    expect(submit.hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText(/account\.profile\.nameLabel/), {
      target: { value: "Alice B" },
    });
    expect(submit.hasAttribute("disabled")).toBe(false);
  });

  it("calls patchAccount with name + language on submit", async () => {
    setUser({ name: "Alice", email: "alice@example.com" });
    const patchAccount = vi.fn().mockResolvedValue({ ok: true });
    render(<ProfileForm patchAccount={patchAccount} requestEmailChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/account\.profile\.nameLabel/), {
      target: { value: "Alice B" },
    });
    fireEvent.click(screen.getByRole("button", { name: /account\.profile\.submit/ }));

    await waitFor(() => expect(patchAccount).toHaveBeenCalled());
    expect(patchAccount).toHaveBeenCalledWith({ name: "Alice B" });
  });

  it("shows success message after successful update", async () => {
    setUser({ name: "Alice", email: "alice@example.com" });
    render(<ProfileForm patchAccount={vi.fn().mockResolvedValue({ ok: true })} />);

    fireEvent.change(screen.getByLabelText(/account\.profile\.nameLabel/), {
      target: { value: "Alice B" },
    });
    fireEvent.click(screen.getByRole("button", { name: /account\.profile\.submit/ }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("account.profile.success"),
    );
  });

  it("requires non-empty name", async () => {
    setUser({ name: "Alice", email: "alice@example.com" });
    const patchAccount = vi.fn();
    render(<ProfileForm patchAccount={patchAccount} />);
    fireEvent.change(screen.getByLabelText(/account\.profile\.nameLabel/), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: /account\.profile\.submit/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("account.profile.errorRequiredName"),
    );
    expect(patchAccount).not.toHaveBeenCalled();
  });

  it("calls requestEmailChange when email changes and shows verificationSent", async () => {
    setUser({ name: "Alice", email: "alice@example.com" });
    const requestEmailChange = vi.fn().mockResolvedValue({ ok: true });
    render(<ProfileForm patchAccount={vi.fn()} requestEmailChange={requestEmailChange} />);

    fireEvent.change(screen.getByLabelText(/account\.profile\.emailLabel/), {
      target: { value: "alice2@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /account\.profile\.verifyEmail/ }));

    await waitFor(() => expect(requestEmailChange).toHaveBeenCalled());
    expect(requestEmailChange).toHaveBeenCalledWith({ newEmail: "alice2@example.com" });
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("account.profile.verificationSent"),
    );
  });

  it("rejects invalid email at the verify step", async () => {
    setUser({ name: "Alice", email: "alice@example.com" });
    const requestEmailChange = vi.fn();
    render(<ProfileForm patchAccount={vi.fn()} requestEmailChange={requestEmailChange} />);

    fireEvent.change(screen.getByLabelText(/account\.profile\.emailLabel/), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /account\.profile\.verifyEmail/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("account.profile.errorInvalidEmail"),
    );
    expect(requestEmailChange).not.toHaveBeenCalled();
  });
});
