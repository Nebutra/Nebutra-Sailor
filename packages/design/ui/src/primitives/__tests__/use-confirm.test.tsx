import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { type ConfirmOptions, type PromptOptions, useConfirm, usePrompt } from "../use-confirm";

function ConfirmHarness({
  options,
  onResult,
}: {
  options: ConfirmOptions;
  onResult: (ok: boolean) => void;
}) {
  const [confirm, dialog] = useConfirm();
  return (
    <>
      <button type="button" onClick={async () => onResult(await confirm(options))}>
        Ask
      </button>
      {dialog}
    </>
  );
}

function PromptHarness({
  options,
  onResult,
}: {
  options: PromptOptions;
  onResult: (value: string | null) => void;
}) {
  const [prompt, dialog] = usePrompt();
  return (
    <>
      <button type="button" onClick={async () => onResult(await prompt(options))}>
        Ask
      </button>
      {dialog}
    </>
  );
}

describe("useConfirm", () => {
  it("renders an alertdialog and resolves true on confirm", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ConfirmHarness
        options={{
          title: "Remove Member",
          description: "Ada loses access.",
          confirmLabel: "Remove",
          tone: "destructive",
        }}
        onResult={onResult}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ask" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Remove Member" });
    expect(dialog).toHaveAccessibleDescription("Ada loses access.");

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("resolves false on cancel and on Escape", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(<ConfirmHarness options={{ title: "Leave Page" }} onResult={onResult} />);

    await user.click(screen.getByRole("button", { name: "Ask" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(false));

    await user.click(screen.getByRole("button", { name: "Ask" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(onResult).toHaveBeenLastCalledWith(false);
  });

  it("runs the action inside the dialog and keeps it open with an inline error on failure", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const action = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Network unreachable"))
      .mockResolvedValueOnce(undefined);
    render(<ConfirmHarness options={{ title: "Revoke Key", action }} onResult={onResult} />);

    await user.click(screen.getByRole("button", { name: "Ask" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network unreachable");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onResult).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("settles a pending request as cancelled when its owner unmounts", async () => {
    let pending: Promise<boolean> | undefined;
    function Owner() {
      const [confirm, dialog] = useConfirm();
      React.useEffect(() => {
        pending = confirm({ title: "Discard Draft" });
      }, [confirm]);
      return dialog;
    }
    const { unmount } = render(<Owner />);
    await screen.findByRole("alertdialog");
    unmount();
    await expect(pending).resolves.toBe(false);
  });
});

describe("usePrompt", () => {
  it("labels the field, validates on submit, and resolves the trimmed value", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <PromptHarness
        options={{
          title: "New Project",
          label: "Project name",
          confirmLabel: "Create",
          validate: (value) => (value.length < 3 ? "Use at least 3 characters." : undefined),
        }}
        onResult={onResult}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ask" }));
    const dialog = await screen.findByRole("dialog", { name: "New Project" });
    const field = screen.getByLabelText("Project name");
    await waitFor(() => expect(field).toHaveFocus());

    // Submit stays enabled; empty input explains itself instead.
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Project name is required.");
    expect(field).toHaveAttribute("aria-invalid", "true");

    await user.type(field, "ab");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Use at least 3 characters.");

    await user.clear(field);
    await user.type(field, "  Atlas  {Enter}");
    await waitFor(() => expect(onResult).toHaveBeenCalledWith("Atlas"));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it("resolves null when cancelled", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(<PromptHarness options={{ title: "Rename", label: "Name" }} onResult={onResult} />);

    await user.click(screen.getByRole("button", { name: "Ask" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
  });
});
