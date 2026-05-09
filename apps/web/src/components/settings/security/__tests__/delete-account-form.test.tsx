// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteAccountForm } from "@/components/settings/security/delete-account-form";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@nebutra/ui/components", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    htmlType,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    htmlType?: "button" | "submit" | "reset";
  } & Record<string, unknown>) => (
    <button
      type={htmlType ?? "button"}
      onClick={onClick}
      disabled={disabled}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </button>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("DeleteAccountForm", () => {
  describe("when not available", () => {
    it("renders the disabled message and no form inputs", () => {
      render(<DeleteAccountForm available={false} />);

      expect(screen.getByText("auth.security.managedByProvider")).toBeTruthy();
      expect(screen.queryByLabelText("auth.security.deleteAccount.passwordPrompt")).toBeNull();
      expect(screen.queryByLabelText("auth.security.deleteAccount.confirmTextLabel")).toBeNull();
      expect(
        screen.queryByRole("button", { name: "auth.security.deleteAccount.submit" }),
      ).toBeNull();
    });
  });

  describe("two-stage UX", () => {
    it("stage 1 shows the Delete account button only", () => {
      render(<DeleteAccountForm available={true} />);

      expect(
        screen.getByRole("button", { name: "auth.security.deleteAccount.submit" }),
      ).toBeTruthy();
      expect(screen.queryByLabelText("auth.security.deleteAccount.passwordPrompt")).toBeNull();
      expect(screen.queryByLabelText("auth.security.deleteAccount.confirmTextLabel")).toBeNull();
    });

    it("clicking Delete account reveals password and confirm-text inputs", () => {
      render(<DeleteAccountForm available={true} />);

      fireEvent.click(screen.getByRole("button", { name: "auth.security.deleteAccount.submit" }));

      expect(screen.getByLabelText("auth.security.deleteAccount.passwordPrompt")).toBeTruthy();
      expect(screen.getByLabelText("auth.security.deleteAccount.confirmTextLabel")).toBeTruthy();
    });
  });

  describe("submit button enablement", () => {
    function openStage2() {
      render(<DeleteAccountForm available={true} />);
      fireEvent.click(screen.getByRole("button", { name: "auth.security.deleteAccount.submit" }));
    }

    it("is disabled when both fields are empty", () => {
      openStage2();
      const submit = screen.getAllByRole("button", {
        name: "auth.security.deleteAccount.submit",
      });
      // The last button is the in-form submit button
      expect((submit[submit.length - 1] as HTMLButtonElement).disabled).toBe(true);
    });

    it("is disabled when only password is filled", () => {
      openStage2();
      const password = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      fireEvent.change(password, { target: { value: "hunter2" } });

      const submits = screen.getAllByRole("button", {
        name: "auth.security.deleteAccount.submit",
      });
      expect((submits[submits.length - 1] as HTMLButtonElement).disabled).toBe(true);
    });

    it("is disabled when confirm is lowercase 'delete'", () => {
      openStage2();
      const password = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      const confirm = screen.getByLabelText(
        "auth.security.deleteAccount.confirmTextLabel",
      ) as HTMLInputElement;

      fireEvent.change(password, { target: { value: "hunter2" } });
      fireEvent.change(confirm, { target: { value: "delete" } });

      const submits = screen.getAllByRole("button", {
        name: "auth.security.deleteAccount.submit",
      });
      expect((submits[submits.length - 1] as HTMLButtonElement).disabled).toBe(true);
    });

    it("is disabled when confirm is 'DELETED'", () => {
      openStage2();
      const password = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      const confirm = screen.getByLabelText(
        "auth.security.deleteAccount.confirmTextLabel",
      ) as HTMLInputElement;

      fireEvent.change(password, { target: { value: "hunter2" } });
      fireEvent.change(confirm, { target: { value: "DELETED" } });

      const submits = screen.getAllByRole("button", {
        name: "auth.security.deleteAccount.submit",
      });
      expect((submits[submits.length - 1] as HTMLButtonElement).disabled).toBe(true);
    });

    it("is enabled when password is non-empty AND confirm is exactly 'DELETE'", () => {
      openStage2();
      const password = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      const confirm = screen.getByLabelText(
        "auth.security.deleteAccount.confirmTextLabel",
      ) as HTMLInputElement;

      fireEvent.change(password, { target: { value: "hunter2" } });
      fireEvent.change(confirm, { target: { value: "DELETE" } });

      const submits = screen.getAllByRole("button", {
        name: "auth.security.deleteAccount.submit",
      });
      expect((submits[submits.length - 1] as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe("cancel", () => {
    it("returns to stage 1 and clears inputs without firing callbacks", () => {
      const onSubmit = vi.fn();
      const onDeleted = vi.fn();
      render(<DeleteAccountForm available={true} onSubmit={onSubmit} onDeleted={onDeleted} />);

      fireEvent.click(screen.getByRole("button", { name: "auth.security.deleteAccount.submit" }));

      const password = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      const confirm = screen.getByLabelText(
        "auth.security.deleteAccount.confirmTextLabel",
      ) as HTMLInputElement;
      fireEvent.change(password, { target: { value: "hunter2" } });
      fireEvent.change(confirm, { target: { value: "DELETE" } });

      fireEvent.click(screen.getByRole("button", { name: "auth.security.deleteAccount.cancel" }));

      // Back to stage 1 (no inputs)
      expect(screen.queryByLabelText("auth.security.deleteAccount.passwordPrompt")).toBeNull();
      expect(screen.queryByLabelText("auth.security.deleteAccount.confirmTextLabel")).toBeNull();

      // Re-open stage 2: inputs should be cleared
      fireEvent.click(screen.getByRole("button", { name: "auth.security.deleteAccount.submit" }));
      const password2 = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      const confirm2 = screen.getByLabelText(
        "auth.security.deleteAccount.confirmTextLabel",
      ) as HTMLInputElement;
      expect(password2.value).toBe("");
      expect(confirm2.value).toBe("");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });

  describe("submission", () => {
    it("calls onSubmit with password and onDeleted on success, and shows success message", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onDeleted = vi.fn();

      render(<DeleteAccountForm available={true} onSubmit={onSubmit} onDeleted={onDeleted} />);
      fireEvent.click(screen.getByRole("button", { name: "auth.security.deleteAccount.submit" }));

      const password = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      const confirm = screen.getByLabelText(
        "auth.security.deleteAccount.confirmTextLabel",
      ) as HTMLInputElement;
      fireEvent.change(password, { target: { value: "hunter2" } });
      fireEvent.change(confirm, { target: { value: "DELETE" } });

      const form = password.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ password: "hunter2" });
      });
      await waitFor(() => {
        expect(onDeleted).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(screen.getByText("auth.security.deleteAccount.success")).toBeTruthy();
      });
    });

    it("maps onSubmit errors via the auth error catalog", async () => {
      const onSubmit = vi.fn().mockRejectedValue({ code: "INVALID_CREDENTIALS" });

      render(<DeleteAccountForm available={true} onSubmit={onSubmit} />);
      fireEvent.click(screen.getByRole("button", { name: "auth.security.deleteAccount.submit" }));

      const password = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      const confirm = screen.getByLabelText(
        "auth.security.deleteAccount.confirmTextLabel",
      ) as HTMLInputElement;
      fireEvent.change(password, { target: { value: "wrong" } });
      fireEvent.change(confirm, { target: { value: "DELETE" } });

      const form = password.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("auth.errors.invalidCredentials")).toBeTruthy();
      });
    });
  });

  describe("pending state", () => {
    let resolveSubmit: () => void = () => undefined;
    let pendingPromise: Promise<void>;

    beforeEach(() => {
      pendingPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
    });

    it("disables the submit button while pending", async () => {
      const onSubmit = vi.fn().mockReturnValue(pendingPromise);
      render(<DeleteAccountForm available={true} onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole("button", { name: "auth.security.deleteAccount.submit" }));

      const password = screen.getByLabelText(
        "auth.security.deleteAccount.passwordPrompt",
      ) as HTMLInputElement;
      const confirm = screen.getByLabelText(
        "auth.security.deleteAccount.confirmTextLabel",
      ) as HTMLInputElement;
      fireEvent.change(password, { target: { value: "hunter2" } });
      fireEvent.change(confirm, { target: { value: "DELETE" } });

      const form = password.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        const submits = screen.getAllByRole("button", {
          name: "auth.security.deleteAccount.submit",
        });
        expect((submits[submits.length - 1] as HTMLButtonElement).disabled).toBe(true);
      });

      resolveSubmit();
    });
  });
});
