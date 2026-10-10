import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarTrigger,
} from "../menubar";

/**
 * APG menubar contract, delivered by Base UI Menubar: roles, aria-expanded,
 * arrow keys between triggers, ArrowDown into a menu, typeahead, and Escape
 * back to the trigger.
 */

function Fixture({ onPaste }: { onPaste?: () => void }) {
  return (
    <Menubar aria-label="Editor">
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New Tab</MenubarItem>
          <MenubarItem>Print</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
          <MenubarItem>Redo</MenubarItem>
          <MenubarItem {...(onPaste ? { onClick: onPaste } : {})}>Paste</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarRadioGroup defaultValue="light">
            <MenubarRadioItem value="light">Light</MenubarRadioItem>
            <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

const trigger = (name: string) => screen.getByRole("menuitem", { name });

describe("Menubar (Base UI, APG menubar)", () => {
  it("renders a menubar of menuitem triggers with popup state", () => {
    render(<Fixture />);
    expect(screen.getByRole("menubar", { name: "Editor" })).toBeInTheDocument();
    const file = trigger("File");
    expect(file).toHaveAttribute("aria-haspopup", "menu");
    expect(file).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the root out of the tab order with a single roving trigger stop", () => {
    render(<Fixture />);
    const root = screen.getByRole("menubar");
    expect(root.tabIndex).toBeLessThan(0);
    const stops = ["File", "Edit", "View"].filter((name) => trigger(name).tabIndex === 0);
    expect(stops).toEqual(["File"]);
  });

  it("moves between triggers with ArrowRight / ArrowLeft and loops", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    act(() => trigger("File").focus());

    await user.keyboard("{ArrowRight}");
    expect(trigger("Edit")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(trigger("View")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(trigger("File")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(trigger("View")).toHaveFocus();
  });

  it("opens with ArrowDown, supports typeahead, and Escape returns to the trigger", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    act(() => trigger("Edit").focus());

    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(trigger("Edit")).toHaveAttribute("aria-expanded", "true"));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Undo" })).toHaveFocus());

    await user.keyboard("p");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Paste" })).toHaveFocus());

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger("Edit")).toHaveFocus();
  });

  it("activates an item with Enter and closes the menu", async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();
    render(<Fixture onPaste={onPaste} />);

    await user.click(trigger("Edit"));
    const paste = await screen.findByRole("menuitem", { name: "Paste" });
    act(() => paste.focus());
    fireEvent.click(paste);

    expect(onPaste).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(trigger("Edit")).toHaveAttribute("aria-expanded", "false"));
  });

  it("exposes radio items with aria-checked", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await user.click(trigger("View"));
    expect(await screen.findByRole("menuitemradio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
