import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";

describe("WelcomeOverlay", () => {
  it("renders member number when visible", () => {
    render(<WelcomeOverlay memberNumber={42} />);
    expect(screen.getByText(/member #42/i)).toBeInTheDocument();
  });

  it("shows welcome message", () => {
    render(<WelcomeOverlay memberNumber={1} />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it("calls onClose when explore button clicked", () => {
    const onClose = vi.fn();
    render(<WelcomeOverlay memberNumber={1} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
