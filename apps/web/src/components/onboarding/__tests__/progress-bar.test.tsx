// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProgressBar } from "../progress-bar";

const STEPS = [
  { id: 1, label: "Workspace" },
  { id: 2, label: "Invite team" },
  { id: 3, label: "Choose plan" },
];

describe("ProgressBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders one circle and label for each of the 3 steps", () => {
    render(<ProgressBar steps={STEPS} currentStep={1} completedSteps={new Set()} />);

    for (const step of STEPS) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
    }

    const circles = screen.getAllByTestId(/^onboarding-step-circle-/);
    expect(circles).toHaveLength(3);
  });

  it("marks the current step with data-state='current'", () => {
    render(<ProgressBar steps={STEPS} currentStep={2} completedSteps={new Set([1])} />);

    expect(screen.getByTestId("onboarding-step-circle-2")).toHaveAttribute("data-state", "current");
  });

  it("marks completed steps with data-state='complete'", () => {
    render(<ProgressBar steps={STEPS} currentStep={3} completedSteps={new Set([1, 2])} />);

    expect(screen.getByTestId("onboarding-step-circle-1")).toHaveAttribute(
      "data-state",
      "complete",
    );
    expect(screen.getByTestId("onboarding-step-circle-2")).toHaveAttribute(
      "data-state",
      "complete",
    );
  });

  it("marks future, not-yet-reached steps with data-state='upcoming'", () => {
    render(<ProgressBar steps={STEPS} currentStep={1} completedSteps={new Set()} />);

    expect(screen.getByTestId("onboarding-step-circle-2")).toHaveAttribute(
      "data-state",
      "upcoming",
    );
    expect(screen.getByTestId("onboarding-step-circle-3")).toHaveAttribute(
      "data-state",
      "upcoming",
    );
  });

  it("exposes accessible progress indicator with aria-valuenow", () => {
    render(<ProgressBar steps={STEPS} currentStep={2} completedSteps={new Set([1])} />);

    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuemin", "1");
    expect(progress).toHaveAttribute("aria-valuemax", "3");
    expect(progress).toHaveAttribute("aria-valuenow", "2");
  });
});
