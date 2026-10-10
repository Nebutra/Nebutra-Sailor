import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../navigation-menu";

/**
 * NavigationMenu on Base UI: click toggles, aria-expanded tracks state, Esc
 * closes and restores focus, arrow keys move between triggers, and the
 * controlled `value` keeps the empty-string-means-closed contract.
 */

function Fixture(props: { value?: string; onValueChange?: (value: string) => void }) {
  return (
    <NavigationMenu aria-label="Main" {...props}>
      <NavigationMenuList>
        <NavigationMenuItem value="product">
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#sailor">Sailor</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="docs">
          <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#api">API reference</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#pricing">Pricing</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const trigger = (name: string) => screen.getByRole("button", { name });

describe("NavigationMenu (Base UI)", () => {
  it("exposes collapsed triggers inside a navigation landmark", () => {
    render(<Fixture />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(trigger("Product")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Sailor")).toBeNull();
  });

  it("opens on click, reports aria-expanded, and closes on a second click", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(trigger("Product"));
    await waitFor(() => expect(trigger("Product")).toHaveAttribute("aria-expanded", "true"));
    expect(await screen.findByText("Sailor")).toBeInTheDocument();

    await user.click(trigger("Product"));
    await waitFor(() => expect(trigger("Product")).toHaveAttribute("aria-expanded", "false"));
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(trigger("Docs"));
    await screen.findByText("API reference");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(trigger("Docs")).toHaveAttribute("aria-expanded", "false"));
    expect(trigger("Docs")).toHaveFocus();
  });

  it("moves between triggers with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    act(() => trigger("Product").focus());

    await user.keyboard("{ArrowRight}");
    expect(trigger("Docs")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(trigger("Product")).toHaveFocus();
  });

  it("keeps the controlled empty-string-means-closed value contract", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Fixture value="" onValueChange={onValueChange} />);

    await user.click(trigger("Product"));
    expect(onValueChange).toHaveBeenLastCalledWith("product");

    rerender(<Fixture value="product" onValueChange={onValueChange} />);
    await waitFor(() => expect(trigger("Product")).toHaveAttribute("aria-expanded", "true"));

    await user.keyboard("{Escape}");
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });
});
