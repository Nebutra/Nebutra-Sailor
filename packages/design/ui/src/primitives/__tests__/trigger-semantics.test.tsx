import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../button";
import { ContextCard } from "../context-card";
import { Description } from "../description";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { RelativeTimeCard } from "../relative-time-card";

/**
 * ContextCard.Trigger renders whatever it is given through Base UI's trigger,
 * which assumed a native <button>. A <time> or an icon got a console warning
 * and no button semantics; Description's info glyph was an aria-hidden svg no
 * keyboard could reach.
 */
describe("Trigger semantics (asChild into Base UI)", () => {
  const warn = vi.spyOn(console, "error").mockImplementation(() => {});
  const warn2 = vi.spyOn(console, "warn").mockImplementation(() => {});
  afterEach(() => {
    warn.mockClear();
    warn2.mockClear();
  });
  const nativeButtonWarnings = () =>
    [...warn.mock.calls, ...warn2.mock.calls]
      .flat()
      .filter((m) => String(m).includes("nativeButton"));

  it("gives a non-button trigger button semantics without a warning", () => {
    render(
      <ContextCard.Trigger content="Deployed from main">
        <time dateTime="2026-09-27">yesterday</time>
      </ContextCard.Trigger>,
    );
    const time = screen.getByText("yesterday");
    expect(time.getAttribute("role")).toBe("button");
    expect(nativeButtonWarnings()).toEqual([]);
  });

  it("keeps a native button a native button", () => {
    render(
      <ContextCard.Trigger content="More">
        <button type="button">Info</button>
      </ContextCard.Trigger>,
    );
    expect(screen.getByRole("button", { name: "Info" }).tagName).toBe("BUTTON");
    expect(nativeButtonWarnings()).toEqual([]);
  });

  it("makes Description's definition reachable by a named button", () => {
    render(<Description title="Region" content="fra1" tooltip="Where requests are served from." />);
    expect(screen.getByRole("button", { name: "About Region" })).toBeTruthy();
    expect(nativeButtonWarnings()).toEqual([]);
  });

  it("renders a relative time without a warning", () => {
    render(<RelativeTimeCard date={new Date("2026-09-27T10:00:00Z")} />);
    expect(nativeButtonWarnings()).toEqual([]);
  });

  it.each([
    [
      "Dialog",
      (child: React.ReactElement) => (
        <Dialog>
          <DialogTrigger asChild>{child}</DialogTrigger>
          <DialogContent>
            <DialogTitle>Release</DialogTitle>
          </DialogContent>
        </Dialog>
      ),
    ],
    [
      "Popover",
      (child: React.ReactElement) => (
        <Popover>
          <PopoverTrigger asChild>{child}</PopoverTrigger>
          <PopoverContent>Details</PopoverContent>
        </Popover>
      ),
    ],
    [
      "DropdownMenu",
      (child: React.ReactElement) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{child}</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    ],
  ])("%s asChild: a <div> becomes a button, a Button stays native, neither warns", (_name, wrap) => {
    const { unmount } = render(wrap(<div>Open image</div>));
    expect(screen.getByText("Open image").getAttribute("role")).toBe("button");
    unmount();
    render(wrap(<Button>Open</Button>));
    expect(screen.getByRole("button", { name: "Open" }).tagName).toBe("BUTTON");
    expect(nativeButtonWarnings()).toEqual([]);
  });
});
