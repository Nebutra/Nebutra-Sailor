import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./navigation-menu";

const meta = {
  title: "Primitives/NavigationMenu",
  component: NavigationMenu,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Hover/click-driven top-level site navigation with flyout panels — one `value` is open across the whole menu at a time (uncontrolled by default, or pass `value` + `onValueChange`). Use it for marketing-site primary nav with rich flyout content; for a plain link row with no flyout, a `<nav>` of `Link`s is enough and this component is overkill.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof NavigationMenu>;

export default meta;
type Story = StoryObj<typeof NavigationMenu>;

export const Default: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[300px] gap-1 p-3">
              <li>
                <NavigationMenuLink
                  href="#"
                  className="block rounded-[var(--radius-md)] p-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium text-foreground">Sailor</span>
                  <p className="text-xs text-muted-foreground">Agent-native SaaS platform</p>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink
                  href="#"
                  className="block rounded-[var(--radius-md)] p-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium text-foreground">Sleptons</span>
                  <p className="text-xs text-muted-foreground">Automation runtime</p>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px] gap-1 p-3">
              <li>
                <NavigationMenuLink
                  href="#"
                  className="block rounded-[var(--radius-md)] p-2 text-sm hover:bg-accent"
                >
                  Getting started
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink
                  href="#"
                  className="block rounded-[var(--radius-md)] p-2 text-sm hover:bg-accent"
                >
                  API reference
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="#"
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /Product/i });

    await userEvent.click(trigger);
    expect(canvas.getByText("Sailor")).toBeVisible();
  },
};

/** A trigger with no flyout renders as a plain `NavigationMenuLink` — no dropdown affordance. */
export const PlainLinkAlongsideFlyouts: Story = {
  name: "Plain link + flyout mixed",
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="#"
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Overview
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[220px] gap-1 p-3">
              <li>
                <NavigationMenuLink
                  href="#"
                  className="block rounded-[var(--radius-md)] p-2 text-sm hover:bg-accent"
                >
                  Changelog
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark flex justify-center rounded-[var(--radius-lg)] bg-background p-8">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Product</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[220px] gap-1 p-3">
                <li>
                  <NavigationMenuLink
                    href="#"
                    className="block rounded-[var(--radius-md)] p-2 text-sm hover:bg-accent"
                  >
                    Sailor
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  ),
};
