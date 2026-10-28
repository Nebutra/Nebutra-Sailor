import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressStepper, Stepper, StepperProvider, useStepper } from "../stepper";

const STEPS = [
  { id: "a", title: "Account" },
  { id: "b", title: "Billing", error: true },
  { id: "c", title: "Review" },
];

function renderStepper(initialStep = 0) {
  return render(
    <div dir="rtl">
      <StepperProvider initialStep={initialStep} steps={STEPS}>
        <Stepper />
      </StepperProvider>
    </div>,
  );
}

describe("ProgressStepper with no steps", () => {
  it("never writes NaN or Infinity into the fill width", () => {
    const { container } = render(<ProgressStepper currentStep={0} totalSteps={0} />);
    const fill = container.querySelector<HTMLElement>("[style*=width]");
    expect(fill?.style.width).toBe("0%");
  });

  it("clamps the fill to 100%", () => {
    const { container } = render(<ProgressStepper currentStep={9} totalSteps={3} />);
    expect(container.querySelector<HTMLElement>("[style*=width]")?.style.width).toBe("100%");
  });
});

describe("useStepper with no steps", () => {
  it("reports 0 progress instead of NaN", () => {
    const { result } = renderHook(() => useStepper({ steps: [] }));
    expect(result.current.progress).toBe(0);
  });
});

describe("Stepper semantics", () => {
  it("renders an ordered list with one item per step", () => {
    renderStepper();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks only the current step with aria-current=step", () => {
    renderStepper(0);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("aria-current", "step");
    expect(items[1]).not.toHaveAttribute("aria-current");
    expect(items[2]).not.toHaveAttribute("aria-current");
  });

  it("reaches the error status through step.error", () => {
    renderStepper(0);
    const items = screen.getAllByRole("listitem");
    expect(items[1]).toHaveAttribute("data-status", "error");
    expect(items[0]).toHaveAttribute("data-status", "current");
    expect(items[2]).toHaveAttribute("data-status", "pending");
  });

  it("keeps error on a step the user has already passed", () => {
    renderStepper(2);
    expect(screen.getAllByRole("listitem")[1]).toHaveAttribute("data-status", "error");
  });
});
