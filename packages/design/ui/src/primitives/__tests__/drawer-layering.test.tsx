import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { overlayZIndex } from "../../tokens/components/overlay";
import { Dialog, DialogContent, DialogTitle } from "../dialog";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../drawer";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../sheet";

afterEach(cleanup);

function zIndexOf(element: Element | null): string {
  return (element as HTMLElement | null)?.style.zIndex ?? "";
}

function queryByAttr(slot: string): HTMLElement {
  return document.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
}

function DrawerFixture({ direction }: { direction?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Drawer defaultOpen direction={direction}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Nested drawer</DrawerTitle>
          <DrawerDescription>Opened on top.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>Body</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

describe("Drawer layering", () => {
  it("takes its backdrop and panel layers from the overlay tokens, not a hard-coded z-50", () => {
    render(<DrawerFixture />);

    const overlay = queryByAttr("drawer-overlay");
    const content = queryByAttr("drawer-content");

    expect(zIndexOf(overlay)).toBe(String(overlayZIndex.backdrop));
    expect(zIndexOf(content)).toBe(String(overlayZIndex.modal));
    expect(overlay.className).not.toMatch(/(^|\s)z-50(\s|$)/);
    expect(content.className).not.toMatch(/(^|\s)z-50(\s|$)/);
  });

  it("opens above the Dialog it is launched from", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Dialog</DialogTitle>
          <Drawer>
            <DrawerTrigger>Open drawer</DrawerTrigger>
            <DrawerContent>
              <DrawerTitle>Nested drawer</DrawerTitle>
              <DrawerDescription>Opened on top.</DrawerDescription>
            </DrawerContent>
          </Drawer>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Dialog" });
    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    const drawer = queryByAttr("drawer-content");

    expect(Number(zIndexOf(drawer))).toBeGreaterThanOrEqual(Number(zIndexOf(dialog)));
    // Equal tiers are ordered by DOM position, so the later portal (the Drawer) paints on top.
    expect(dialog.compareDocumentPosition(drawer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sits on the same tier as Sheet and opens above the Sheet it is launched from", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>Sheet</SheetTitle>
          <SheetDescription>Sheet description</SheetDescription>
          <Drawer>
            <DrawerTrigger>Open drawer</DrawerTrigger>
            <DrawerContent>
              <DrawerTitle>Nested drawer</DrawerTitle>
              <DrawerDescription>Opened on top.</DrawerDescription>
            </DrawerContent>
          </Drawer>
        </SheetContent>
      </Sheet>,
    );

    const sheet = queryByAttr("sheet-content");
    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    const drawer = queryByAttr("drawer-content");

    expect(zIndexOf(drawer)).toBe(zIndexOf(sheet));
    expect(sheet.compareDocumentPosition(drawer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lets callers still override the layer through style", () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent style={{ zIndex: 7 }}>
          <DrawerTitle>Custom</DrawerTitle>
          <DrawerDescription>Custom layer</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    );

    expect(zIndexOf(queryByAttr("drawer-content"))).toBe("7");
  });
});

describe("DrawerHeader alignment", () => {
  it("is start-aligned by default and centred only inside a bottom drawer", () => {
    render(<DrawerFixture direction="bottom" />);

    const header = queryByAttr("drawer-header");

    expect(queryByAttr("drawer-content")).toHaveAttribute("data-vaul-drawer-direction", "bottom");
    expect(header.className).toMatch(/(^|\s)text-start(\s|$)/);
    expect(header.className).toContain(
      "group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center",
    );
    expect(header.className).not.toMatch(/(^|\s)text-center(\s|$)/);
  });

  it.each([
    "top",
    "left",
    "right",
  ] as const)("keeps start alignment in a %s drawer", (direction) => {
    render(<DrawerFixture direction={direction} />);

    const header = queryByAttr("drawer-header");

    expect(queryByAttr("drawer-content")).toHaveAttribute("data-vaul-drawer-direction", direction);
    // The centring variant is keyed to the bottom direction, so these keep the base text-start.
    expect(header.className).toMatch(/(^|\s)text-start(\s|$)/);
    expect(header.className).not.toContain(`direction=${direction}]/drawer-content:text-center`);
  });

  it("uses logical alignment so it follows dir=rtl", () => {
    render(
      <div dir="rtl">
        <DrawerFixture direction="right" />
      </div>,
    );

    expect(queryByAttr("drawer-header").className).not.toMatch(/(^|\s)text-(left|right)(\s|$)/);
  });
});

describe("Drawer side directions under dir=rtl", () => {
  // Vaul animates and drags left/right drawers along the physical x axis, so the panel must be
  // anchored to the physical edge it slides from; a logical start/end anchor would sit on the
  // opposite side in RTL while the animation still arrives from the other.
  it("anchors left and right drawers to physical edges", () => {
    render(
      <div dir="rtl">
        <DrawerFixture direction="right" />
      </div>,
    );
    const className = queryByAttr("drawer-content").className;

    expect(className).toContain("data-[vaul-drawer-direction=right]:right-0");
    expect(className).toContain("data-[vaul-drawer-direction=left]:left-0");
    expect(className).not.toMatch(/data-\[vaul-drawer-direction=(left|right)\]:(start|end)-0/);
  });

  it("puts the hairline on the inner physical edge", () => {
    render(<DrawerFixture direction="left" />);
    const className = queryByAttr("drawer-content").className;

    expect(className).toContain("data-[vaul-drawer-direction=right]:border-l");
    expect(className).toContain("data-[vaul-drawer-direction=left]:border-r");
    expect(className).not.toMatch(/data-\[vaul-drawer-direction=(left|right)\]:border-(s|e)/);
  });
});
