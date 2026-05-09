// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Polyfill localStorage — vitest 4 uses Node's experimental localStorage which
// is missing several Storage API methods (clear, removeItem in some flavors).
{
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    key(i: number) {
      return Array.from(store.keys())[i] ?? null;
    },
    getItem(k: string) {
      return store.has(k) ? (store.get(k) as string) : null;
    },
    setItem(k: string, v: string) {
      store.set(k, String(v));
    },
    removeItem(k: string) {
      store.delete(k);
    },
    clear() {
      store.clear();
    },
  };
  Object.defineProperty(window, "localStorage", { value: storage, writable: true });
}

// next-intl mock — return the key for any namespace + key combination.
vi.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string): string =>
      `${namespace}.${key}`,
}));

// Stub @nebutra/ui/components — the real module pulls heavyweight
// dependencies (@emoji-mart/data JSON imports) that vitest cannot resolve
// without `import attributes`. We only need a plain <button> here.
vi.mock("@nebutra/ui/components", () => ({
  Button: ({
    children,
    onClick,
    htmlType = "button",
    className,
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    htmlType?: "button" | "submit" | "reset";
    className?: string;
  }) => (
    <button type={htmlType} onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

vi.mock("@nebutra/ui/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" "),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

// Stub the heavyweight step components so the shell's logic is the unit under
// test. The real step components have their own existing tests/behaviour.
vi.mock("../create-workspace-step", () => ({
  CreateWorkspaceStep: ({ onComplete }: { onComplete: () => void }) => (
    <button type="button" data-testid="finish-step-1" onClick={onComplete}>
      finish-step-1
    </button>
  ),
}));

vi.mock("../invite-team-step", () => ({
  InviteTeamStep: ({ onComplete }: { onComplete: () => void }) => (
    <button type="button" data-testid="finish-step-2" onClick={onComplete}>
      finish-step-2
    </button>
  ),
}));

import { ONBOARDING_STORAGE_KEY, WizardShell } from "../wizard-shell";

describe("WizardShell", () => {
  beforeEach(() => {
    pushMock.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders step 1 (workspace) on initial mount when no persisted state exists", () => {
    render(<WizardShell />);
    expect(screen.getByTestId("finish-step-1")).toBeInTheDocument();
    expect(screen.queryByTestId("finish-step-2")).toBeNull();
  });

  it("advances to step 2 (invite) after step 1 completes", () => {
    render(<WizardShell />);
    fireEvent.click(screen.getByTestId("finish-step-1"));
    expect(screen.getByTestId("finish-step-2")).toBeInTheDocument();
    expect(screen.queryByTestId("finish-step-1")).toBeNull();
  });

  it("persists wizard state to localStorage on advancement", () => {
    render(<WizardShell />);
    fireEvent.click(screen.getByTestId("finish-step-1"));

    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as {
      currentStep: number;
      completedSteps: number[];
    };
    expect(parsed.currentStep).toBe(2);
    expect(parsed.completedSteps).toContain(1);
  });

  it("restores wizard state from localStorage on remount", () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ currentStep: 2, completedSteps: [1] }),
    );

    render(<WizardShell />);
    expect(screen.getByTestId("finish-step-2")).toBeInTheDocument();
  });

  it("shows a Back button on step 2 that returns to step 1 without unmarking completion", () => {
    render(<WizardShell />);
    fireEvent.click(screen.getByTestId("finish-step-1"));
    expect(screen.getByTestId("finish-step-2")).toBeInTheDocument();

    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    // Step 1 visible again
    expect(screen.getByTestId("finish-step-1")).toBeInTheDocument();

    // Completion was preserved — re-completing step 1 should advance us back to step 2.
    fireEvent.click(screen.getByTestId("finish-step-1"));
    expect(screen.getByTestId("finish-step-2")).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? "{}") as {
      completedSteps: number[];
    };
    expect(stored.completedSteps).toContain(1);
  });

  it("clears localStorage and redirects to / when 'Skip for now' is clicked on step 3", () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ currentStep: 3, completedSteps: [1, 2] }),
    );

    render(<WizardShell />);
    const skipButton = screen.getByRole("button", { name: "onboarding.plan.skip" });
    act(() => {
      fireEvent.click(skipButton);
    });

    expect(pushMock).toHaveBeenCalledWith("/");
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });

  it("clears localStorage and redirects to /choose-plan when 'Choose plan' is clicked on step 3", () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ currentStep: 3, completedSteps: [1, 2] }),
    );

    render(<WizardShell />);
    const choosePlanButton = screen.getByRole("button", {
      name: "onboarding.plan.choose",
    });
    act(() => {
      fireEvent.click(choosePlanButton);
    });

    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/choose-plan");
  });

  it("ignores corrupted localStorage payload and falls back to step 1", () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "{not-json");
    render(<WizardShell />);
    expect(screen.getByTestId("finish-step-1")).toBeInTheDocument();
  });
});
