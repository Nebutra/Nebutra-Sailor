// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type PricingPlan, PricingPlanGrid } from "@/components/billing/pricing-plan-grid";

const PLANS: PricingPlan[] = [
  {
    id: "plan_free",
    name: "Free",
    description: "For evaluation workspaces.",
    features: ["1 project", "1 team member"],
    tier: "FREE",
    prices: [],
  },
  {
    id: "plan_pro",
    name: "Pro",
    description: "For active SaaS teams.",
    features: ["10 projects", "Priority support"],
    tier: "PRO",
    recommended: true,
    prices: [
      { id: "price_pro_month", interval: "month", amount: 2900, currency: "USD" },
      { id: "price_pro_year", interval: "year", amount: 27900, currency: "USD" },
    ],
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    description: "For regulated teams.",
    features: ["SSO", "Audit logs"],
    tier: "ENTERPRISE",
    prices: [{ id: "price_ent_month", interval: "month", amount: 99900, currency: "USD" }],
  },
];

describe("PricingPlanGrid", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders one card per non-active plan", () => {
    render(<PricingPlanGrid plans={PLANS} />);

    expect(screen.getByRole("article", { name: /free/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /pro/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /enterprise/i })).toBeInTheDocument();
  });

  it("deduplicates free/default plans before rendering cards", () => {
    render(
      <PricingPlanGrid
        plans={[
          PLANS[0],
          {
            ...PLANS[0],
            id: "default_free",
            name: "Default",
            description: "Internal fallback free plan.",
          },
          PLANS[1],
        ]}
      />,
    );

    expect(screen.getAllByText("$0")).toHaveLength(1);
    expect(screen.getByRole("article", { name: /free/i })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /default/i })).not.toBeInTheDocument();
  });

  it("hides the active plan from the grid", () => {
    render(<PricingPlanGrid plans={PLANS} activePlanId="plan_pro" />);

    expect(screen.queryByRole("article", { name: /pro/i })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: /free/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /enterprise/i })).toBeInTheDocument();
  });

  it("shows the recommended badge on flagged plans", () => {
    render(<PricingPlanGrid plans={PLANS} />);

    const proCard = screen.getByRole("article", { name: /pro/i });
    expect(within(proCard).getByText(/recommended/i)).toBeInTheDocument();
  });

  it("renders interval tabs only when at least one plan offers month + year", () => {
    render(<PricingPlanGrid plans={PLANS} />);
    expect(screen.getByRole("tab", { name: /monthly/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /yearly/i })).toBeInTheDocument();
  });

  it("does not render interval tabs when only month prices exist", () => {
    const monthOnly: PricingPlan[] = [
      {
        ...PLANS[1],
        prices: [PLANS[1].prices[0]], // month only
      },
    ];

    render(<PricingPlanGrid plans={monthOnly} />);
    expect(screen.queryByRole("tab", { name: /monthly/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /yearly/i })).not.toBeInTheDocument();
  });

  it("switches displayed price when the user toggles the year tab", async () => {
    const user = userEvent.setup();
    render(<PricingPlanGrid plans={PLANS} />);

    // Default: month price visible
    const proCard = screen.getByRole("article", { name: /pro/i });
    expect(within(proCard).getByText(/\$29(\.00)?/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /yearly/i }));

    expect(within(proCard).getByText(/\$279(\.00)?/)).toBeInTheDocument();
  });

  it("calls onSelectPlan with planId + interval when the CTA is clicked", async () => {
    const user = userEvent.setup();
    const onSelectPlan = vi.fn().mockResolvedValue(undefined);

    render(<PricingPlanGrid plans={PLANS} onSelectPlan={onSelectPlan} />);

    const proCard = screen.getByRole("article", { name: /pro/i });
    await user.click(within(proCard).getByRole("button", { name: /choose|select|pro/i }));

    await waitFor(() => {
      expect(onSelectPlan).toHaveBeenCalledWith("plan_pro", "month");
    });
  });

  it("disables the CTA and shows loading state while onSelectPlan is in flight", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const onSelectPlan = vi.fn().mockReturnValue(pending);

    render(<PricingPlanGrid plans={PLANS} onSelectPlan={onSelectPlan} />);

    const proCard = screen.getByRole("article", { name: /pro/i });
    const cta = within(proCard).getByRole("button", { name: /choose|select|pro/i });
    await user.click(cta);

    await waitFor(() => {
      expect(cta).toBeDisabled();
    });
    expect(within(proCard).getByText(/redirecting|loading|wait/i)).toBeInTheDocument();

    resolve();
  });

  it("ignores duplicate rapid checkout clicks while the first selection is pending", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const onSelectPlan = vi.fn().mockReturnValue(pending);

    render(<PricingPlanGrid plans={PLANS} onSelectPlan={onSelectPlan} />);

    const proCard = screen.getByRole("article", { name: /pro/i });
    const cta = within(proCard).getByRole("button", { name: /choose|select|pro/i });
    await user.dblClick(cta);

    await waitFor(() => {
      expect(onSelectPlan).toHaveBeenCalledTimes(1);
    });

    resolve();
  });

  it("default onSelectPlan posts to /api/billing/checkout and redirects to the response url", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: "https://stripe.example/checkout/session_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const originalLocation = window.location;
    const setHref = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new Proxy(originalLocation, {
        set(_target, prop, value) {
          if (prop === "href") {
            setHref(value);
            return true;
          }
          return Reflect.set(_target, prop, value);
        },
        get(target, prop) {
          if (prop === "origin") return "https://app.example";
          return Reflect.get(target, prop);
        },
      }),
    });

    render(<PricingPlanGrid plans={PLANS} orgId="org_1" />);

    const proCard = screen.getByRole("article", { name: /pro/i });
    await user.click(within(proCard).getByRole("button", { name: /choose|select|pro/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/billing/checkout",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      planId: "plan_pro",
      interval: "month",
      redirectUrl: "https://app.example/checkout-return?organizationId=org_1",
    });

    await waitFor(() => {
      expect(setHref).toHaveBeenCalledWith("https://stripe.example/checkout/session_1");
    });

    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("default checkout forwards selected price trial and seat metadata", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: "https://stripe.example/checkout/session_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new Proxy(originalLocation, {
        set() {
          return true;
        },
        get(target, prop) {
          if (prop === "origin") return "https://app.example";
          return Reflect.get(target, prop);
        },
      }),
    });

    render(
      <PricingPlanGrid
        plans={[
          {
            ...PLANS[1],
            prices: [{ ...PLANS[1].prices[0], trialPeriodDays: 14, seatBased: true }],
          },
        ]}
        orgId="org_1"
      />,
    );

    await user.click(screen.getByRole("button", { name: /choose pro/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      planId: "plan_pro",
      interval: "month",
      trialPeriodDays: 14,
      seatBased: true,
    });

    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("surfaces checkout failures through onSelectError without crashing the grid", async () => {
    const user = userEvent.setup();
    const checkoutError = new Error("Checkout unavailable.");
    const onSelectPlan = vi.fn().mockRejectedValue(checkoutError);
    const onSelectError = vi.fn();

    render(
      <PricingPlanGrid plans={PLANS} onSelectPlan={onSelectPlan} onSelectError={onSelectError} />,
    );

    const proCard = screen.getByRole("article", { name: /pro/i });
    await user.click(within(proCard).getByRole("button", { name: /choose|select|pro/i }));

    await waitFor(() => {
      expect(onSelectError).toHaveBeenCalledWith(checkoutError, "plan_pro");
    });
    expect(within(proCard).getByRole("button", { name: /choose|select|pro/i })).toBeEnabled();
  });

  it("shows an inline recovery message when default checkout fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Stripe customer mapping is missing." }), {
          status: 424,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    render(<PricingPlanGrid plans={PLANS} orgId="org_1" />);

    const proCard = screen.getByRole("article", { name: /pro/i });
    await user.click(within(proCard).getByRole("button", { name: /choose|select|pro/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /stripe customer mapping is missing/i,
    );
  });

  // ── Trial badge ────────────────────────────────────────────────────────────

  it("does not render a trial badge when no price has trialPeriodDays", () => {
    render(<PricingPlanGrid plans={PLANS} />);
    const proCard = screen.getByRole("article", { name: /pro/i });
    expect(within(proCard).queryByText(/free .*-day trial/i)).not.toBeInTheDocument();
  });

  it("renders a trial badge when the visible price has trialPeriodDays > 0", () => {
    const trialPlans: PricingPlan[] = [
      {
        ...PLANS[1],
        prices: [{ ...PLANS[1].prices[0], trialPeriodDays: 14 }, PLANS[1].prices[1]],
      },
    ];

    render(<PricingPlanGrid plans={trialPlans} />);
    const proCard = screen.getByRole("article", { name: /pro/i });
    expect(within(proCard).getByText(/free 14-day trial/i)).toBeInTheDocument();
  });

  it("renders different trial labels per plan based on the visible price", () => {
    const mixed: PricingPlan[] = [
      {
        ...PLANS[1],
        prices: [{ ...PLANS[1].prices[0], trialPeriodDays: 7 }, PLANS[1].prices[1]],
      },
      {
        ...PLANS[2],
        prices: [{ ...PLANS[2].prices[0], trialPeriodDays: 30 }],
      },
    ];

    render(<PricingPlanGrid plans={mixed} />);
    const proCard = screen.getByRole("article", { name: /pro/i });
    const entCard = screen.getByRole("article", { name: /enterprise/i });
    expect(within(proCard).getByText(/free 7-day trial/i)).toBeInTheDocument();
    expect(within(entCard).getByText(/free 30-day trial/i)).toBeInTheDocument();
  });

  // ── Per-seat label ─────────────────────────────────────────────────────────

  it("renders the / seat suffix when the plan is flagged perSeat", () => {
    const seatPlans: PricingPlan[] = [{ ...PLANS[1], perSeat: true }];
    render(<PricingPlanGrid plans={seatPlans} />);
    const proCard = screen.getByRole("article", { name: /pro/i });
    expect(within(proCard).getByText(/\/ seat/i)).toBeInTheDocument();
  });

  it("renders the / seat suffix when the visible price is seatBased", () => {
    const seatPlans: PricingPlan[] = [
      {
        ...PLANS[1],
        prices: [{ ...PLANS[1].prices[0], seatBased: true }, PLANS[1].prices[1]],
      },
    ];
    render(<PricingPlanGrid plans={seatPlans} />);
    const proCard = screen.getByRole("article", { name: /pro/i });
    expect(within(proCard).getByText(/\/ seat/i)).toBeInTheDocument();
  });
});
