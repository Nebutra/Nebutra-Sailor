import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Command, CommandDialog, CommandInput, CommandItem, CommandList } from "../command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "../menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../navigation-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../sheet";

/**
 * Right-to-left contract for the overlay and menu family. Base UI only mirrors arrow keys and
 * `inline-*` sides from its own DirectionProvider, never from the DOM, so every test here wraps
 * the component in a plain `dir="rtl"` element and expects the library to bridge it.
 */

const classOf = (element: Element | null) => element?.getAttribute("class") ?? "";

// cmdk scrolls the selected item into view on mount; jsdom has no layout, so stub it.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Sheet side start / end (logical)", () => {
  function renderSheet(side: "start" | "end" | "left" | "right") {
    render(
      <Sheet defaultOpen>
        <SheetContent side={side}>
          <SheetTitle>Title</SheetTitle>
          <SheetDescription>Body</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    const content = document.querySelector('[data-slot="sheet-content"]');
    expect(content).not.toBeNull();
    return content as HTMLElement;
  }

  it("anchors side=start to the inline-start edge and slides it from there in both directions", () => {
    const cls = classOf(renderSheet("start"));
    expect(cls).toContain("start-[var(--sheet-inset)]");
    expect(cls).not.toMatch(/(^|\s)(left|right)-\[/);
    expect(cls).toContain("ltr:data-starting-style:-translate-x-full");
    expect(cls).toContain("rtl:data-starting-style:translate-x-full");
    expect(cls).toContain("ltr:data-ending-style:-translate-x-full");
    expect(cls).toContain("rtl:data-ending-style:translate-x-full");
  });

  it("anchors side=end to the inline-end edge and slides it from there in both directions", () => {
    const cls = classOf(renderSheet("end"));
    expect(cls).toContain("end-[var(--sheet-inset)]");
    expect(cls).not.toMatch(/(^|\s)(left|right)-\[/);
    expect(cls).toContain("ltr:data-starting-style:translate-x-full");
    expect(cls).toContain("rtl:data-starting-style:-translate-x-full");
    expect(cls).toContain("ltr:data-ending-style:translate-x-full");
    expect(cls).toContain("rtl:data-ending-style:-translate-x-full");
  });

  it("keeps left and right physical and backward compatible", () => {
    const left = classOf(renderSheet("left"));
    expect(left).toContain("left-[var(--sheet-inset)]");
    expect(left).toContain("data-starting-style:-translate-x-full");
    expect(left).not.toContain("rtl:");
  });

  it("exposes the requested side for styling and keeps the close button on the inline end", () => {
    const content = renderSheet("start");
    expect(content).toHaveAttribute("data-side", "start");
    const close = screen.getByRole("button", { name: "Close" });
    expect(classOf(close)).toContain("end-[var(--sheet-close-offset)]");
  });
});

describe("directional chevrons mirror in RTL", () => {
  it("DropdownMenuSubTrigger chevron flips", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Deep</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const icon = screen.getByRole("menuitem", { name: "More" }).querySelector("svg");
    expect(classOf(icon)).toContain("rtl:rotate-180");
  });

  it("ContextMenuSubTrigger default chevron flips", async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div>Area</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Deep</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Area"));
    const row = await screen.findByRole("menuitem", { name: "More" });
    expect(classOf(row.querySelector("svg"))).toContain("rtl:rotate-180");
  });

  it("MenubarSubTrigger chevron flips", async () => {
    const user = userEvent.setup();
    render(
      <Menubar aria-label="Bar">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Email</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    await user.click(screen.getByRole("menuitem", { name: "File" }));
    const row = await screen.findByRole("menuitem", { name: "Share" });
    expect(classOf(row.querySelector("svg"))).toContain("rtl:rotate-180");
  });
});

describe("submenu keyboard direction follows dir", () => {
  function dropdown(dir: "ltr" | "rtl") {
    return (
      <div dir={dir}>
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Deep item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  it("LTR: ArrowRight opens a dropdown submenu, ArrowLeft does not", async () => {
    const user = userEvent.setup();
    render(dropdown("ltr"));
    const sub = await screen.findByRole("menuitem", { name: "More" });
    act(() => sub.focus());
    await user.keyboard("{ArrowLeft}");
    expect(screen.queryByText("Deep item")).toBeNull();
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Deep item")).toBeInTheDocument();
  });

  it("RTL: ArrowLeft opens a dropdown submenu, ArrowRight does not", async () => {
    const user = userEvent.setup();
    render(dropdown("rtl"));
    const sub = await screen.findByRole("menuitem", { name: "More" });
    act(() => sub.focus());
    await user.keyboard("{ArrowRight}");
    expect(screen.queryByText("Deep item")).toBeNull();
    await user.keyboard("{ArrowLeft}");
    expect(await screen.findByText("Deep item")).toBeInTheDocument();
  });

  it("RTL: ArrowRight closes the dropdown submenu again", async () => {
    const user = userEvent.setup();
    render(dropdown("rtl"));
    const sub = await screen.findByRole("menuitem", { name: "More" });
    act(() => sub.focus());
    await user.keyboard("{ArrowLeft}");
    const deep = await screen.findByRole("menuitem", { name: "Deep item" });
    await waitFor(() => expect(deep).toHaveFocus());
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.queryByText("Deep item")).toBeNull());
  });

  it("an explicit dir prop wins over the surrounding element", async () => {
    const user = userEvent.setup();
    render(
      <div dir="ltr">
        <DropdownMenu defaultOpen dir="rtl">
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Deep item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>,
    );
    const sub = await screen.findByRole("menuitem", { name: "More" });
    act(() => sub.focus());
    await user.keyboard("{ArrowLeft}");
    expect(await screen.findByText("Deep item")).toBeInTheDocument();
  });

  it("RTL: ArrowLeft opens a context-menu submenu", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <ContextMenu>
          <ContextMenuTrigger>
            <div>Area</div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Deep item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      </div>,
    );
    fireEvent.contextMenu(screen.getByText("Area"));
    const sub = await screen.findByRole("menuitem", { name: "More" });
    act(() => sub.focus());
    // Not asserting the opposite key: Base UI treats ArrowRight as the close key here in RTL.
    await user.keyboard("{ArrowLeft}");
    expect(await screen.findByText("Deep item")).toBeInTheDocument();
  });

  it("context-menu submenus open beside their trigger, not below it", async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div>Area</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Deep item</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Area"));
    const sub = await screen.findByRole("menuitem", { name: "More" });
    fireEvent.click(sub);
    const deep = await screen.findByText("Deep item");
    const popup = deep.closest('[role="menu"]');
    expect(popup).toHaveAttribute("data-side", "inline-end");
  });

  it("menubar submenus open on the inline-end side", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Menubar aria-label="Bar">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarSub>
                <MenubarSubTrigger>Share</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Email</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>,
    );
    await user.click(screen.getByRole("menuitem", { name: "File" }));
    const sub = await screen.findByRole("menuitem", { name: "Share" });
    act(() => sub.focus());
    await user.keyboard("{ArrowLeft}");
    const email = await screen.findByText("Email");
    expect(email.closest('[role="menu"]')).toHaveAttribute("data-side", "inline-end");
  });
});

describe("horizontal roving between triggers follows dir", () => {
  // Three triggers, because focus loops: with two, "next" and "previous" are the same trigger
  // and the test could not tell a mirrored bar from an unmirrored one.
  it("Menubar: in RTL ArrowLeft moves to the next trigger and ArrowRight back", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Menubar aria-label="Editor">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Zoom</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>,
    );
    act(() => screen.getByRole("menuitem", { name: "File" }).focus());
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("menuitem", { name: "File" })).toHaveFocus();
  });

  it("NavigationMenu: in RTL ArrowLeft moves to the next trigger and ArrowRight back", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <NavigationMenu aria-label="Main">
          <NavigationMenuList>
            <NavigationMenuItem value="product">
              <NavigationMenuTrigger>Product</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="#a">Sailor</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="docs">
              <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="#b">API</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="company">
              <NavigationMenuTrigger>Company</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="#c">About</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>,
    );
    act(() => screen.getByRole("button", { name: "Product" }).focus());
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Docs" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Product" })).toHaveFocus();
  });
});

describe("CommandDialog accessible name and cmdk passthrough", () => {
  it("names the dialog 'Command menu' by default, visually hidden", () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem>Calendar</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Command menu" });
    expect(dialog).toBeInTheDocument();
    expect(classOf(screen.getByText("Command menu"))).toContain("sr-only");
  });

  it("uses a supplied title and description for the dialog name and description", () => {
    render(
      <CommandDialog open title="Jump to" description="Type to filter destinations">
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem>Calendar</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    expect(screen.getByRole("dialog", { name: "Jump to" })).toHaveAccessibleDescription(
      "Type to filter destinations",
    );
  });

  it("passes shouldFilter and loop through to the inner Command", async () => {
    const user = userEvent.setup();
    render(
      <CommandDialog open shouldFilter={false} loop>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="a">Alpha</CommandItem>
          <CommandItem value="b">Beta</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    const input = screen.getByPlaceholderText("Search");
    await user.type(input, "zzz");
    // shouldFilter={false}: typing never hides items.
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    // loop: ArrowUp from the first item wraps to the last.
    await user.keyboard("{ArrowUp}");
    expect(screen.getByText("Beta").closest("[cmdk-item]")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("passes a custom filter through to the inner Command", async () => {
    const user = userEvent.setup();
    const filter = vi.fn((_value: string, search: string) => (search === "x" ? 0 : 1));
    render(
      <CommandDialog open filter={filter}>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="a">Alpha</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    await user.type(screen.getByPlaceholderText("Search"), "x");
    expect(filter).toHaveBeenCalled();
    expect(screen.queryByText("Alpha")).toBeNull();
  });
});

describe("Command standalone is unchanged", () => {
  it("still renders without a dialog", () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>Calendar</CommandItem>
        </CommandList>
      </Command>,
    );
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });
});

describe("ContextMenuItem with href", () => {
  async function open(item: React.ReactNode) {
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div>Area</div>
        </ContextMenuTrigger>
        <ContextMenuContent>{item}</ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Area"));
  }

  it("fires onSelect when a link item is clicked", async () => {
    const onSelect = vi.fn();
    await open(
      <ContextMenuItem href="#docs" onSelect={onSelect}>
        Docs
      </ContextMenuItem>,
    );
    const link = await screen.findByRole("menuitem", { name: "Docs" });
    expect(link.tagName).toBe("A");
    fireEvent.click(link);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marks a disabled link item aria-disabled and ignores clicks", async () => {
    const onSelect = vi.fn();
    await open(
      <ContextMenuItem href="#docs" disabled onSelect={onSelect}>
        Docs
      </ContextMenuItem>,
    );
    const link = await screen.findByRole("menuitem", { name: "Docs" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("data-disabled");
    expect(link).not.toHaveAttribute("href");
    fireEvent.click(link);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("passes closeOnClick through to a link item", async () => {
    await open(
      <ContextMenuItem href="#docs" closeOnClick>
        Docs
      </ContextMenuItem>,
    );
    const link = await screen.findByRole("menuitem", { name: "Docs" });
    fireEvent.click(link);
    await waitFor(() => expect(screen.queryByRole("menuitem", { name: "Docs" })).toBeNull());
  });
});
