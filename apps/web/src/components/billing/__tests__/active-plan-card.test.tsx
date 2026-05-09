// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "billing.activePlan.title": "Active plan",
  "billing.activePlan.manage": "Manage subscription",
  "billing.activePlan.noPlanTitle": "No active plan",
  "billing.activePlan.noPlanDescription":
    "Pick a plan to unlock paid features and higher usage limits.",
  "billing.activePlan.choosePlan": "Choose a plan",
  "billing.activePlan.renewsOn": "Renews on {date}",
  "billing.activePlan.endsOn": "Ends on {date}",
  "billing.activePlan.trialEndsOn": "Trial ends {date}",
  "billing.activePlan.status.active": "Active",
  "billing.activePlan.status.trialing": "Trialing",
  "billing.activePlan.status.past_due": "Past due",
  "billing.activePlan.status.canceled": "Canceled",
  "billing.activePlan.status.free": "Free",
  "billing.activePlan.errors.loadFailed": "Could not load your billing status.",
};

function interpolate(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(vars[key] ?? `{${key}}`));
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, vars?: Record<string, unknown>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const template = messages[fullKey];
    return template ? interpolate(template, vars) : fullKey;
  },
}));

import type { ActivePlanCardSnapshot } from "../active-plan-card";
import { ActivePlanCard } from "../active-plan-card";

function makeSnapshot(overrides: Partial<ActivePlanCardSnapshot> = {}): ActivePlanCardSnapshot {
  return {
    active: true,
    planId: "plan_pro",
    planName: "Pro",
    status: "active",
    currentPeriodEnd: "2026-12-31T00:00:00.000Z",
    ...overrides,
  };
}

describe("ActivePlanCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the plan name and active status pill for a paid plan", () => {
    render(<ActivePlanCard organizationId="org_1" snapshot={makeSnapshot()} />);

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage subscription/i })).toHaveAttribute(
      "href",
      "/billing",
    );
  });

  it("renders the trialing status pill and trial end date", () => {
    render(
      <ActivePlanCard organizationId="org_1" snapshot={makeSnapshot({ status: "trialing" })} />,
    );

    expect(screen.getByText("Trialing")).toBeInTheDocument();
    expect(screen.getByText(/trial ends/i)).toBeInTheDocument();
  });

  it("renders the past_due status pill", () => {
    render(
      <ActivePlanCard organizationId="org_1" snapshot={makeSnapshot({ status: "past_due" })} />,
    );

    expect(screen.getByText("Past due")).toBeInTheDocument();
  });

  it("renders the canceled status pill and shows endsOn copy", () => {
    render(
      <ActivePlanCard organizationId="org_1" snapshot={makeSnapshot({ status: "canceled" })} />,
    );

    expect(screen.getByText("Canceled")).toBeInTheDocument();
    expect(screen.getByText(/ends on/i)).toBeInTheDocument();
  });

  it("renders Free state with the same card frame", () => {
    render(
      <ActivePlanCard
        organizationId="org_1"
        snapshot={makeSnapshot({
          active: false,
          planId: "plan_free",
          planName: "Free",
          status: "free",
          currentPeriodEnd: null,
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: /free/i })).toBeInTheDocument();
    // Free plan shows the Choose a plan upgrade CTA rather than Manage subscription.
    expect(screen.queryByRole("link", { name: /manage subscription/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /choose a plan/i })).toHaveAttribute(
      "href",
      "/choose-plan",
    );
  });

  it("renders an empty state when no snapshot is supplied", () => {
    render(<ActivePlanCard organizationId="org_1" snapshot={null} />);

    expect(screen.getByText(/no active plan/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /choose a plan/i })).toHaveAttribute(
      "href",
      "/choose-plan",
    );
  });

  it("renders a load-failed message when error prop is set", () => {
    render(<ActivePlanCard organizationId="org_1" snapshot={null} error />);

    expect(screen.getByRole("alert")).toHaveTextContent(/could not load/i);
  });
});
