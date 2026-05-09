// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock("@nebutra/ui/components", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    // biome-ignore lint/a11y/useButtonType: test stub
    <button {...props} />
  ),
}));

import { DeleteOrganizationForm } from "../delete-organization-form";

describe("DeleteOrganizationForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders only the trigger button at idle", () => {
    render(<DeleteOrganizationForm orgId="org_1" organizationName="Acme" />);
    expect(
      screen.getByRole("button", { name: "organizations.settings.delete.trigger" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/confirmLabel/)).toBeNull();
  });

  it("reveals the form on click and disables submit until confirmation matches", () => {
    render(<DeleteOrganizationForm orgId="org_1" organizationName="Acme" />);
    fireEvent.click(screen.getByRole("button", { name: "organizations.settings.delete.trigger" }));

    const submit = screen.getByRole("button", { name: "organizations.settings.delete.submit" });
    expect(submit.hasAttribute("disabled")).toBe(true);

    const input = screen.getByLabelText(/confirmLabel/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "acme" } }); // wrong case
    expect(submit.hasAttribute("disabled")).toBe(true);

    fireEvent.change(input, { target: { value: "Acme" } });
    expect(submit.hasAttribute("disabled")).toBe(false);
  });

  it("cancels back to idle and clears state", () => {
    render(<DeleteOrganizationForm orgId="org_1" organizationName="Acme" />);
    fireEvent.click(screen.getByRole("button", { name: "organizations.settings.delete.trigger" }));
    fireEvent.change(screen.getByLabelText(/confirmLabel/) as HTMLInputElement, {
      target: { value: "Acme" },
    });
    fireEvent.click(screen.getByRole("button", { name: "organizations.settings.delete.cancel" }));

    expect(screen.queryByLabelText(/confirmLabel/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "organizations.settings.delete.trigger" }),
    ).toBeTruthy();
  });

  it("calls onSubmit with the confirmation, fires onDeleted, and pushes to /", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    render(
      <DeleteOrganizationForm
        orgId="org_1"
        organizationName="Acme"
        onSubmit={onSubmit}
        onDeleted={onDeleted}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "organizations.settings.delete.trigger" }));
    fireEvent.change(screen.getByLabelText(/confirmLabel/) as HTMLInputElement, {
      target: { value: "Acme" },
    });
    fireEvent.click(screen.getByRole("button", { name: "organizations.settings.delete.submit" }));

    await new Promise((r) => setTimeout(r, 0));

    expect(onSubmit).toHaveBeenCalledWith({ confirmation: "Acme" });
    expect(onDeleted).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(screen.getByRole("status").textContent).toBe("organizations.settings.delete.success");
  });

  it("renders error from onSubmit via auth error catalog", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ code: "TOO_MANY_REQUESTS" });
    render(<DeleteOrganizationForm orgId="org_1" organizationName="Acme" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "organizations.settings.delete.trigger" }));
    fireEvent.change(screen.getByLabelText(/confirmLabel/) as HTMLInputElement, {
      target: { value: "Acme" },
    });
    fireEvent.click(screen.getByRole("button", { name: "organizations.settings.delete.submit" }));

    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByRole("alert").textContent).toBe("auth.errors.rateLimited");
  });
});
