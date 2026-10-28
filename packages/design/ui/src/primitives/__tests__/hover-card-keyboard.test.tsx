import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card";

/**
 * HoverCard opens from pointer hover AND from keyboard focus / click / touch.
 * Delays are exercised with fake timers; the card is portalled, so it is queried
 * from `document`.
 */

function Fixture({
  openDelay,
  closeDelay,
  onOpenChange,
  side,
}: {
  openDelay?: number;
  closeDelay?: number;
  onOpenChange?: (open: boolean) => void;
  side?: "inline-start" | "inline-end" | "top";
}) {
  return (
    <div>
      <button type="button">before</button>
      <HoverCard
        {...(openDelay === undefined ? {} : { openDelay })}
        {...(closeDelay === undefined ? {} : { closeDelay })}
        {...(onOpenChange ? { onOpenChange } : {})}
      >
        <HoverCardTrigger>@acme-web</HoverCardTrigger>
        <HoverCardContent {...(side ? { side } : {})}>
          <p>Marketing site.</p>
          <a href="/deployments">Deployments</a>
        </HoverCardContent>
      </HoverCard>
      <button type="button">after</button>
    </div>
  );
}

const card = () => screen.queryByText("Marketing site.");
const trigger = () => screen.getByRole("button", { name: "@acme-web" });

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("HoverCard keyboard, click and touch", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the pointer hover behaviour: opens after openDelay, closes after closeDelay", async () => {
    render(<Fixture closeDelay={100} openDelay={200} />);
    fireEvent.mouseEnter(trigger().parentElement as HTMLElement);
    await advance(150);
    expect(card()).toBeNull();
    await advance(100);
    expect(card()).toBeInTheDocument();
    fireEvent.mouseLeave(trigger().parentElement as HTMLElement);
    await advance(50);
    expect(card()).toBeInTheDocument();
    await advance(100);
    expect(card()).toBeNull();
  });

  it("opens when the trigger gets keyboard focus, after openDelay", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Fixture openDelay={200} />);
    await user.tab(); // "before"
    await user.tab(); // trigger
    expect(trigger()).toHaveFocus();
    await advance(150);
    expect(card()).toBeNull();
    await advance(100);
    expect(card()).toBeInTheDocument();
    expect(trigger()).toHaveFocus(); // the card must not steal focus
  });

  it("closes after closeDelay when focus leaves the trigger and the card", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Fixture closeDelay={100} openDelay={0} />);
    await user.tab();
    await user.tab();
    await advance(10);
    expect(card()).toBeInTheDocument();
    act(() => screen.getByRole("button", { name: "before" }).focus());
    await advance(50);
    expect(card()).toBeInTheDocument();
    await advance(100);
    expect(card()).toBeNull();
    expect(screen.getByRole("button", { name: "before" })).toHaveFocus();
  });

  it("does not close while focus moves from the trigger into the card, and Tab never traps", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Fixture closeDelay={100} openDelay={0} />);
    await user.tab();
    await user.tab();
    await advance(10);
    expect(card()).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Deployments" });
    act(() => link.focus());
    await advance(300);
    expect(card()).toBeInTheDocument();
    // Tab out of the card: the next page control gets focus and the card closes.
    await user.tab();
    await advance(300);
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    expect(card()).toBeNull();
  });

  it("closes on Escape and leaves focus on the trigger", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Fixture openDelay={0} />);
    await user.tab();
    await user.tab();
    await advance(10);
    expect(card()).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await advance(10);
    expect(card()).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on Escape when focus is inside the card and returns it to the trigger", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Fixture openDelay={0} />);
    await user.tab();
    await user.tab();
    await advance(10);
    act(() => screen.getByRole("link", { name: "Deployments" }).focus());
    await user.keyboard("{Escape}");
    await advance(10);
    expect(card()).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("toggles on click (touch / Enter / Space) without waiting for openDelay", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Fixture openDelay={600} />);
    // Touch has no hover: a tap is just a click.
    fireEvent.pointerDown(trigger(), { pointerType: "touch" });
    fireEvent.click(trigger());
    await advance(10);
    expect(card()).toBeInTheDocument();
    fireEvent.pointerDown(trigger(), { pointerType: "touch" });
    fireEvent.click(trigger());
    await advance(10);
    expect(card()).toBeNull();
    // Keyboard activation toggles too.
    act(() => trigger().focus());
    await user.keyboard("{Enter}");
    await advance(10);
    expect(card()).toBeInTheDocument();
  });

  it("a mouse click on a hover-opened card keeps it open", async () => {
    render(<Fixture openDelay={0} />);
    const wrapper = trigger().parentElement as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    await advance(10);
    expect(card()).toBeInTheDocument();
    fireEvent.pointerDown(trigger(), { pointerType: "mouse" });
    fireEvent.click(trigger(), { detail: 1 });
    await advance(10);
    expect(card()).toBeInTheDocument();
  });

  it("a tap does not reopen the card through the emulated mouseenter", async () => {
    render(<Fixture openDelay={200} />);
    const wrapper = trigger().parentElement as HTMLElement;
    fireEvent.pointerDown(trigger(), { pointerType: "touch" });
    fireEvent.mouseEnter(wrapper);
    fireEvent.click(trigger());
    await advance(10);
    expect(card()).toBeInTheDocument();
    fireEvent.pointerDown(trigger(), { pointerType: "touch" });
    fireEvent.click(trigger());
    await advance(300);
    expect(card()).toBeNull();
  });

  it("reports every change through onOpenChange", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Fixture onOpenChange={onOpenChange} openDelay={0} />);
    await user.tab();
    await user.tab();
    await advance(10);
    expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.anything());
    await user.keyboard("{Escape}");
    await advance(10);
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.anything());
  });

  it("under dir=rtl, logical sides open without error and mirror against LTR", async () => {
    // jsdom has no layout, so every rect is zero: a card placed on the physical left sits at
    // translate(-offset) and one on the physical right at translate(+offset).
    const positionerX = () => {
      const positioner = document.querySelector<HTMLElement>("[data-side]");
      const match = /translate\((-?[\d.]+)px/.exec(positioner?.style.transform ?? "");
      return match ? Number(match[1]) : null;
    };
    const { rerender } = render(
      <div dir="rtl">
        <Fixture openDelay={0} side="inline-start" />
      </div>,
    );
    const wrapper = trigger().parentElement as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    await advance(50);
    expect(card()).toBeInTheDocument();
    const rtlX = positionerX();
    fireEvent.mouseLeave(wrapper);
    await advance(200);
    expect(card()).toBeNull();
    rerender(
      <div dir="ltr">
        <Fixture openDelay={0} side="inline-start" />
      </div>,
    );
    fireEvent.mouseEnter(trigger().parentElement as HTMLElement);
    await advance(50);
    expect(card()).toBeInTheDocument();
    const ltrX = positionerX();
    expect(rtlX).not.toBeNull();
    expect(ltrX).not.toBeNull();
    expect(Math.sign(rtlX as number)).toBe(-Math.sign(ltrX as number));
  });
});
