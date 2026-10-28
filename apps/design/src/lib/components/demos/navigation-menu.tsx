"use client";

import {
  Button,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, Stack, State } from "../demo-kit";

const ITEM =
  "block rounded-md p-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground";
const LIST = "grid w-72 max-w-[calc(100vw-2rem)] gap-1 break-words p-2";

const PRODUCTS = [
  { title: "Analytics", body: "Track traffic and conversion across every project." },
  { title: "Deployments", body: "Ship previews on every push and promote with one click." },
  { title: "Observability", body: "Logs, traces and alerts in one place." },
];
const GUIDES = [{ title: "Guides", body: "Step-by-step walkthroughs." }];

const stop = (event: React.MouseEvent) => event.preventDefault();

function Links({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ul className={LIST}>
      {items.map((item) => (
        <li key={item.title}>
          <NavigationMenuLink className={ITEM} href={`/${item.title.toLowerCase()}`} onClick={stop}>
            <span className="block font-medium text-foreground">{item.title}</span>
            <span className="block text-muted-foreground">{item.body}</span>
          </NavigationMenuLink>
        </li>
      ))}
    </ul>
  );
}

function DocsLink({ active = false }: { active?: boolean }) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink
        active={active}
        className={navigationMenuTriggerStyle()}
        href="/docs"
        onClick={stop}
      >
        Docs
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

function Nav({
  orientation = "horizontal",
  children,
}: {
  orientation?: "horizontal" | "vertical";
  children: React.ReactNode;
}) {
  return (
    <NavigationMenu orientation={orientation}>
      <NavigationMenuList>{children}</NavigationMenuList>
    </NavigationMenu>
  );
}

function ProductsItem() {
  return (
    <NavigationMenuItem value="products">
      <NavigationMenuTrigger>Products</NavigationMenuTrigger>
      <NavigationMenuContent>
        <Links items={PRODUCTS} />
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function ResourcesItem() {
  return (
    <NavigationMenuItem value="resources">
      <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
      <NavigationMenuContent>
        <Links items={GUIDES} />
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

export default function NavigationMenuDemo() {
  const [value, setValue] = React.useState("");

  return (
    <DemoPage>
      <State
        breaks="A nav where each panel is its own popover stacked with a z-index. Here one shared viewport resizes between panels, so moving from Products to Resources morphs the panel instead of closing one and opening another."
        code={`<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem value="products">
      <NavigationMenuTrigger>Products</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-72 gap-1 p-2">
          <li>
            <NavigationMenuLink href="/analytics">Analytics</NavigationMenuLink>
          </li>
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
    <NavigationMenuItem>
      <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/docs">
        Docs
      </NavigationMenuLink>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>`}
        id="default"
        note="Hover or press Products, then slide across to Resources. The Docs link opens nothing."
        title="Default"
      >
        <div className="min-h-64">
          <Nav>
            <ProductsItem />
            <ResourcesItem />
            <DocsLink />
          </Nav>
        </div>
      </State>

      <State
        breaks="The current page marked only by the colour that hover also uses, so the active link cannot be told from a hovered one. An active link takes a lighter tint; hover and focus use the full accent."
        id="active"
        note="Docs is the current page. Hover Pricing to compare the two tints."
        title="Active link"
      >
        <Row align="start">
          <Nav>
            <DocsLink active />
            <NavigationMenuItem>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                href="/pricing"
                onClick={stop}
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
          </Nav>
        </Row>
      </State>

      <State
        breaks="A controlled menu whose value drifts from what is open. value is the open item's value, and an empty string means every panel is closed; the readout is the same state the menu reads."
        code={`const [value, setValue] = useState("");

<NavigationMenu value={value} onValueChange={setValue}>
  …
</NavigationMenu>`}
        id="controlled"
        note={`Open item: ${value || "none"}. The buttons set it from outside; hovering and pressing set it from inside.`}
        title="Controlled"
      >
        <Stack>
          <Row>
            <Button onClick={() => setValue("products")} size="sm" variant="outline">
              Open Products
            </Button>
            <Button onClick={() => setValue("")} size="sm" variant="outline">
              Close
            </Button>
          </Row>
          <div className="min-h-64">
            <NavigationMenu onValueChange={setValue} value={value}>
              <NavigationMenuList>
                <ProductsItem />
                <DocsLink />
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </Stack>
      </State>

      <State
        breaks="A panel with a trigger and nothing inside it, which opens a blank box. A section with no entries should say so, or drop the trigger."
        id="empty"
        note="Left: a trigger whose panel has no content. Right: the same panel with an explicit message."
        title="Empty panel"
      >
        <div className="min-h-40">
          <Row align="start">
            <Nav>
              <NavigationMenuItem value="empty">
                <NavigationMenuTrigger>Empty</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-72" />
                </NavigationMenuContent>
              </NavigationMenuItem>
            </Nav>
            <Nav>
              <NavigationMenuItem value="explained">
                <NavigationMenuTrigger>Empty, explained</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <p className="w-72 p-3 text-muted-foreground text-sm">
                    Nothing is published in this section yet.
                  </p>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </Nav>
          </Row>
        </div>
      </State>

      <State
        breaks="A long trigger label that cannot shrink and pushes the nav wider than its container, or a long link title that overflows the panel instead of wrapping."
        id="overflow"
        note="Left: a long trigger label. The trigger is w-max, so it neither wraps nor truncates; the container scrolls. Right: a long link title that wraps inside the panel."
        title="Overflow — long labels"
      >
        <div className="min-h-56">
          <Row align="start">
            <div className="max-w-full overflow-x-auto">
              <Nav>
                <NavigationMenuItem value="long">
                  <NavigationMenuTrigger>{LONG_LABEL}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <Links items={[{ title: "Analytics", body: "Track traffic." }]} />
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </Nav>
            </div>
            <Nav>
              <NavigationMenuItem value="long-link">
                <NavigationMenuTrigger>Long link</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <Links items={[{ title: LONG_LABEL, body: "A title that has to wrap." }]} />
                </NavigationMenuContent>
              </NavigationMenuItem>
            </Nav>
          </Row>
        </div>
      </State>

      <State
        breaks="Many top-level items in a narrow container. The list is a single row that does not wrap, so the overflow has to scroll or the nav has to collapse into a menu at that width."
        id="narrow"
        note="Six items in a 240px container. The list keeps one row; the container scrolls."
        title="Many items in a narrow container"
      >
        <div className="w-60 max-w-full overflow-x-auto">
          <Nav>
            {["Products", "Solutions", "Pricing", "Docs", "Blog", "Company"].map((name) => (
              <NavigationMenuItem key={name}>
                <NavigationMenuLink
                  className={navigationMenuTriggerStyle()}
                  href={`/${name.toLowerCase()}`}
                  onClick={stop}
                >
                  {name}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </Nav>
        </div>
      </State>

      <State
        breaks="Vertical orientation that swaps the keys but not the layout. The list is still a row unless you lay it out as a column; orientation=vertical makes ↑ ↓ move between triggers and → open the panel."
        id="vertical"
        note="A column of triggers, laid out with className on the list, with orientation=vertical."
        title="Vertical orientation"
      >
        <div className="min-h-56">
          <NavigationMenu orientation="vertical">
            <NavigationMenuList className="flex-col items-start space-x-0">
              <ProductsItem />
              <ResourcesItem />
              <DocsLink />
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </State>

      <State
        breaks="A navigation that ignores dir: the chevron gap sits on the wrong side of the label and ArrowRight still moves to the next trigger. Check the gap between each label and its chevron, then press ArrowLeft on a trigger."
        id="rtl"
        note="The same navigation under dir=rtl. The chevron gap is a logical margin, and the arrow keys between triggers swap (ArrowLeft moves to the next trigger)."
        title="Right-to-left"
      >
        <div className="min-h-56" dir="rtl">
          <Nav>
            <ProductsItem />
            <DocsLink active />
          </Nav>
        </div>
      </State>

      <State
        breaks="A nav that opens only on hover, which keyboard and touch users cannot do. The triggers are buttons: Enter, Space or a tap opens the panel, and the arrow keys move between them."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "reaches the navigation's first trigger." },
            { keys: "← →", does: "move between the top-level triggers." },
            { keys: "Enter / Space / ↓", does: "opens the focused trigger's panel." },
            { keys: "Escape", does: "closes the panel and returns focus to its trigger." },
          ]}
        >
          <div className="min-h-64">
            <Nav>
              <ProductsItem />
              <ResourcesItem />
              <DocsLink />
            </Nav>
          </div>
        </KeyboardPath>
      </State>

      <Aside title="NavigationMenuViewport and NavigationMenuIndicator">
        <p>
          <code>NavigationMenu</code> renders the shared viewport itself, so{" "}
          <code>NavigationMenuViewport</code> is a deprecated export that renders nothing.{" "}
          <code>NavigationMenuIndicator</code> is a decorative caret you place yourself; the root
          does not position it under the open trigger.
        </p>
      </Aside>
    </DemoPage>
  );
}
