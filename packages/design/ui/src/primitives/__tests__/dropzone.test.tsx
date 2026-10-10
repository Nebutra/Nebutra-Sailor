import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dropzone, fileMatchesAccept } from "../dropzone";

const png = (name = "logo.png", bytes = 10) =>
  new File([new Uint8Array(bytes)], name, { type: "image/png" });
const pdf = () => new File(["%PDF"], "brief.pdf", { type: "application/pdf" });

function drop(target: HTMLElement, files: File[]) {
  const event = createEvent.drop(target);
  Object.defineProperty(event, "dataTransfer", {
    value: { files, items: files.map((f) => ({ kind: "file", type: f.type })), types: ["Files"] },
  });
  fireEvent(target, event);
}

describe("fileMatchesAccept", () => {
  it("follows the input accept syntax", () => {
    expect(fileMatchesAccept(png(), "image/*")).toBe(true);
    expect(fileMatchesAccept(png(), ".PNG")).toBe(true);
    expect(fileMatchesAccept(png(), "image/jpeg,.pdf")).toBe(false);
    expect(fileMatchesAccept(pdf(), "image/jpeg,.pdf")).toBe(true);
    expect(fileMatchesAccept(pdf(), undefined)).toBe(true);
  });
});

describe("Dropzone", () => {
  it("is a labelled, keyboard-reachable native file control", async () => {
    const user = userEvent.setup();
    render(
      <Dropzone
        label="Upload logo"
        description="PNG, up to 1 KB"
        accept="image/png"
        onFiles={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/Upload logo/);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/png");
    expect(input).toHaveAccessibleDescription("PNG, up to 1 KB");

    await user.tab();
    expect(input).toHaveFocus();
  });

  it("accepts files from the picker and announces the selection", async () => {
    const user = userEvent.setup();
    const onFiles = vi.fn();
    render(<Dropzone label="Upload" accept="image/*" onFiles={onFiles} />);

    await user.upload(screen.getByLabelText(/Upload/), png());
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: "logo.png" })]);
    expect(screen.getByText("logo.png selected.")).toHaveAttribute("aria-live", "polite");
  });

  it("accepts dropped files and exposes drag state for styling", () => {
    const onFiles = vi.fn();
    render(<Dropzone label="Upload" multiple onFiles={onFiles} />);
    const surface = screen.getByText("Upload").closest("label") as HTMLElement;

    fireEvent.dragEnter(surface, { dataTransfer: { items: [], types: ["Files"] } });
    expect(surface).toHaveAttribute("data-dragging");

    drop(surface, [png("a.png"), png("b.png")]);
    expect(surface).not.toHaveAttribute("data-dragging");
    expect(onFiles).toHaveBeenCalledWith([
      expect.objectContaining({ name: "a.png" }),
      expect.objectContaining({ name: "b.png" }),
    ]);
  });

  it("rejects by type, size and count with reasons shown inline", () => {
    const onFiles = vi.fn();
    const onReject = vi.fn();
    render(
      <Dropzone
        label="Upload"
        accept="image/*"
        multiple
        maxFiles={1}
        maxSize={100}
        onFiles={onFiles}
        onReject={onReject}
      />,
    );
    const surface = screen.getByText("Upload").closest("label") as HTMLElement;

    drop(surface, [png("ok.png"), pdf(), png("huge.png", 500), png("extra.png")]);

    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: "ok.png" })]);
    const reasons = onReject.mock.calls[0]?.[0].map((r: { reason: string }) => r.reason);
    expect(reasons).toEqual(["type", "size", "count"]);
    expect(screen.getByLabelText(/Upload/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/brief\.pdf is not an accepted file type/)).toBeInTheDocument();
  });

  it("ignores input while disabled", () => {
    const onFiles = vi.fn();
    render(<Dropzone label="Upload" disabled onFiles={onFiles} />);
    const surface = screen.getByText("Upload").closest("label") as HTMLElement;
    drop(surface, [png()]);
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Upload/)).toBeDisabled();
  });

  it("renders a progress bar in the progress slot", () => {
    render(<Dropzone label="Upload" progress={40} progressLabel="Uploading" onFiles={vi.fn()} />);
    expect(screen.getByRole("progressbar", { name: "Uploading" })).toBeInTheDocument();
  });
});
