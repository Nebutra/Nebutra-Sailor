import { DirectionProvider } from "@base-ui/react/direction-provider";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

/**
 * Popups render in a portal outside the `dir="rtl"` subtree their trigger sits in. Base UI resolves
 * `inline-start` / `inline-end` from its DirectionProvider and `align="start" | "end"` from the
 * `direction` of the positioner element, so the library has to measure the trigger and hand the
 * direction to both. These tests wrap the component in a plain `dir` element and expect the popup
 * to follow it.
 */

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

/** The `dir` in effect for a popup element: the nearest ancestor-or-self carrying the attribute. */
const dirOf = (popup: Element | null) => popup?.closest("[dir]")?.getAttribute("dir") ?? null;

/**
 * Which physical edge the popup was pushed toward. The positioner is the element carrying `dir`;
 * Base UI offsets it by `sideOffset` along the resolved physical side, so under jsdom (no layout)
 * the sign of the x translation is the observable: negative = left of the trigger, positive = right.
 */
function physicalSide(inside: Element | null): "left" | "right" | "none" {
  const positioner = inside?.closest<HTMLElement>("[dir]");
  const x = /translate\((-?\d+(?:\.\d+)?)px/.exec(positioner?.style.transform ?? "")?.[1];
  const value = Number(x ?? 0);
  return value < 0 ? "left" : value > 0 ? "right" : "none";
}

describe("Popover", () => {
  function popover(dir: "ltr" | "rtl") {
    return (
      <div dir={dir}>
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent side="inline-end" align="start">
            Panel body
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  it("gives the portalled popup the direction of its trigger", async () => {
    render(popover("rtl"));
    const body = await screen.findByText("Panel body");
    expect(dirOf(body)).toBe("rtl");
    expect(body.closest('[data-slot="popover-positioner"]')).toHaveAttribute("dir", "rtl");
  });

  it("keeps the logical side and align on the popup", async () => {
    render(popover("rtl"));
    const popup = (await screen.findByText("Panel body")).closest('[data-slot="popover-content"]');
    expect(popup).toHaveAttribute("data-side", "inline-end");
    expect(popup).toHaveAttribute("data-align", "start");
  });

  it("resolves inline-end to the physical left side in RTL and right in LTR", async () => {
    const { unmount } = render(popover("rtl"));
    expect(physicalSide(await screen.findByText("Panel body"))).toBe("left");
    unmount();
    render(popover("ltr"));
    expect(physicalSide(await screen.findByText("Panel body"))).toBe("right");
  });

  it("LTR is unchanged: dir=ltr on the positioner", async () => {
    render(popover("ltr"));
    expect(dirOf(await screen.findByText("Panel body"))).toBe("ltr");
  });

  it("renders without a dir ancestor as ltr", async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Panel body</PopoverContent>
      </Popover>,
    );
    expect(dirOf(await screen.findByText("Panel body"))).toBe("ltr");
  });

  it("follows a Base UI DirectionProvider when no dir attribute is set", async () => {
    render(
      <DirectionProvider direction="rtl">
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Panel body</PopoverContent>
        </Popover>
      </DirectionProvider>,
    );
    expect(dirOf(await screen.findByText("Panel body"))).toBe("rtl");
  });

  it("an explicit dir prop wins over the surrounding element", async () => {
    render(
      <div dir="ltr">
        <Popover defaultOpen dir="rtl">
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Panel body</PopoverContent>
        </Popover>
      </div>,
    );
    expect(dirOf(await screen.findByText("Panel body"))).toBe("rtl");
  });
});

describe("Tooltip", () => {
  function tooltip(dir: "ltr" | "rtl") {
    return (
      <div dir={dir}>
        <Tooltip defaultOpen>
          <TooltipTrigger>Hint</TooltipTrigger>
          <TooltipContent side="inline-end" align="start">
            Tip body
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  it("gives the portalled tooltip the direction of its trigger", async () => {
    render(tooltip("rtl"));
    expect(dirOf(await screen.findByText("Tip body"))).toBe("rtl");
  });

  it("accepts the logical inline-end side and resolves it against the trigger", async () => {
    const { unmount } = render(tooltip("rtl"));
    const rtl = await screen.findByText("Tip body");
    expect(rtl.closest("[data-side]")).toHaveAttribute("data-side", "inline-end");
    expect(physicalSide(rtl)).toBe("left");
    unmount();
    render(tooltip("ltr"));
    expect(physicalSide(await screen.findByText("Tip body"))).toBe("right");
  });

  it("LTR is unchanged", async () => {
    render(tooltip("ltr"));
    expect(dirOf(await screen.findByText("Tip body"))).toBe("ltr");
  });

  it("keeps the physical left and right sides physical", async () => {
    render(
      <div dir="rtl">
        <Tooltip defaultOpen>
          <TooltipTrigger>Hint</TooltipTrigger>
          <TooltipContent side="right">Tip body</TooltipContent>
        </Tooltip>
      </div>,
    );
    const popup = (await screen.findByText("Tip body")).closest("[data-side]");
    expect(popup).toHaveAttribute("data-side", "right");
  });
});

describe("Select", () => {
  function select(dir: "ltr" | "rtl") {
    return (
      <div dir={dir}>
        <Select defaultValue="a">
          <SelectTrigger aria-label="Pick">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Alpha</SelectItem>
            <SelectItem value="b">Beta</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  it("gives the portalled listbox the direction of its trigger", async () => {
    const user = userEvent.setup();
    render(select("rtl"));
    await user.click(screen.getByRole("combobox", { name: "Pick" }));
    expect(dirOf(await screen.findByRole("option", { name: "Beta" }))).toBe("rtl");
  });

  it("LTR is unchanged", async () => {
    const user = userEvent.setup();
    render(select("ltr"));
    await user.click(screen.getByRole("combobox", { name: "Pick" }));
    expect(dirOf(await screen.findByRole("option", { name: "Beta" }))).toBe("ltr");
  });

  it("keeps the selected-item indicator on the inline-end edge with logical padding", async () => {
    const user = userEvent.setup();
    render(select("rtl"));
    await user.click(screen.getByRole("combobox", { name: "Pick" }));
    const option = await screen.findByRole("option", { name: "Alpha" });
    const cls = option.getAttribute("class") ?? "";
    expect(cls).toContain("ps-[");
    expect(cls).toContain("pe-[");
    expect(cls).not.toMatch(/(^|\s)(pl|pr)-/);
    expect(option.querySelector("span.absolute")?.getAttribute("class")).toContain("end-[");
  });

  it("the options-API select also carries the direction", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Select
          label="Plan"
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          defaultValue="a"
        />
      </div>,
    );
    await user.click(screen.getByRole("combobox"));
    expect(dirOf(await screen.findByRole("option", { name: "Beta" }))).toBe("rtl");
  });
});

describe("Combobox", () => {
  function combobox(dir: "ltr" | "rtl") {
    return (
      <div dir={dir}>
        <Combobox
          label="Framework"
          placeholder="Choose"
          options={[
            { value: "next", label: "Next" },
            { value: "remix", label: "Remix" },
          ]}
        />
      </div>
    );
  }

  it("opens its list with the trigger's direction in RTL", async () => {
    const user = userEvent.setup();
    render(combobox("rtl"));
    await user.click(screen.getByRole("combobox"));
    expect(dirOf(await screen.findByText("Remix"))).toBe("rtl");
  });

  it("LTR is unchanged", async () => {
    const user = userEvent.setup();
    render(combobox("ltr"));
    await user.click(screen.getByRole("combobox"));
    expect(dirOf(await screen.findByText("Remix"))).toBe("ltr");
  });

  it("puts the selection check first in the row so it sits on the inline-start edge", async () => {
    const user = userEvent.setup();
    render(combobox("rtl"));
    await user.click(screen.getByRole("combobox"));
    const row = (await screen.findByText("Remix")).closest("[cmdk-item]");
    expect(row?.firstElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(row?.getAttribute("class") ?? "").not.toMatch(/(^|\s)(pl|pr|ml|mr)-/);
  });
});

describe("HoverCard", () => {
  function card(dir: "ltr" | "rtl") {
    return (
      <div dir={dir}>
        <HoverCard open>
          <HoverCardTrigger>
            <a href="#profile">Profile</a>
          </HoverCardTrigger>
          <HoverCardContent side="inline-end">Card body</HoverCardContent>
        </HoverCard>
      </div>
    );
  }

  it("gives the portalled card the direction of its trigger", async () => {
    render(card("rtl"));
    const body = await screen.findByText("Card body");
    expect(dirOf(body)).toBe("rtl");
    expect(physicalSide(body)).toBe("left");
  });

  it("LTR is unchanged", async () => {
    render(card("ltr"));
    const body = await screen.findByText("Card body");
    expect(dirOf(body)).toBe("ltr");
    expect(physicalSide(body)).toBe("right");
  });
});
