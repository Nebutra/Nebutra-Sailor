// @vitest-environment jsdom
/** The wallet chip tells the truth per state; the 402 notice leads to checkout. */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InsufficientBalanceNotice, WalletChip, walletLabel } from "./wallet-chip";

afterEach(cleanup);
const ORIGIN = "https://kcq.nebutra.com";

describe("walletLabel", () => {
  it("covers every state", () => {
    expect(walletLabel({ status: "loading" })).toBe("余额");
    expect(walletLabel({ status: "error" })).toBe("余额不可用");
    expect(walletLabel({ status: "internal" })).toBe("内部使用 · 不计费");
    expect(walletLabel({ status: "ready", balance: 3, currency: "USD", usage: [] })).toBe("$3.00");
  });
});

describe("WalletChip", () => {
  it("shows the balance and refreshes it when the menu opens", () => {
    const onOpen = vi.fn();
    render(
      createElement(WalletChip, {
        wallet: { status: "ready", balance: 4.25, currency: "USD", usage: [] },
        origin: ORIGIN,
        onOpen,
      }),
    );
    const trigger = screen.getByRole("button", { name: "KCQ AI $4.25" });
    fireEvent.click(trigger);
    expect(onOpen).toHaveBeenCalled();
  });

  it("shows staff an internal, not-billed marker instead of a balance", () => {
    render(
      createElement(WalletChip, {
        wallet: { status: "internal" },
        origin: ORIGIN,
        onOpen: vi.fn(),
      }),
    );
    expect(screen.getByText("内部使用 · 不计费")).toBeTruthy();
  });
});

describe("InsufficientBalanceNotice", () => {
  it("is an alert whose action goes to checkout for the KCQ offer", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, origin: ORIGIN, assign },
      configurable: true,
    });
    const onDismiss = vi.fn();
    render(createElement(InsufficientBalanceNotice, { origin: ORIGIN, onDismiss }));
    expect(screen.getByRole("alert").textContent).toContain("余额不足");
    fireEvent.click(screen.getByRole("button", { name: "充值" }));
    const url = new URL(String(assign.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/checkout");
    expect(url.searchParams.get("offer")).toBe("kcq_topup");
    expect(url.searchParams.get("returnTo")).toBe(`${ORIGIN}/`);
    fireEvent.click(screen.getByRole("button", { name: "稍后" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
