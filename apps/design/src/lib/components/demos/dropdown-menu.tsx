"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, State } from "../demo-kit";

export default function DropdownMenuDemo() {
  const [protectedProd, setProtectedProd] = React.useState(true);

  return (
    <DemoPage>
      <State
        breaks="A hand-built role=menu. Seven app-side menus reimplement this, and the parts they miss are always the same: typeahead, arrow-key wrap, and returning focus to the trigger."
        id="default"
        note="Labels, items, separators, shortcuts and a checkbox item."
        title="Default"
      >
        <Row>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Project</DropdownMenuLabel>
              <DropdownMenuItem>
                Rename
                <DropdownMenuShortcut>R</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={protectedProd} onCheckedChange={setProtectedProd}>
                Production protected
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem disabled>Rotate secrets</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </State>

      <State
        breaks="A destructive item that looks like every other item. It needs to be visually separated and last, so it cannot be hit on the way to something else."
        id="destructive"
        note="The destructive item is below a separator, at the bottom."
        title="Destructive item"
      >
        <Row>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>View logs</DropdownMenuItem>
              <DropdownMenuItem>Redeploy</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[hsl(var(--destructive-strong))]">
                Delete deployment
                <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </State>

      <State
        breaks="An empty menu rendering a bare rounded box with nothing in it. A menu with no available actions should say so."
        id="empty"
        note="Left: nothing inside. Right: an explicit disabled row that explains why."
        title="Empty"
      >
        <Row>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">Empty</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40" />
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Empty, explained</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              <DropdownMenuItem disabled>No actions available on a shared project</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </State>

      <State
        breaks="A long item label that widens the menu past the viewport, or one that clips without a shortcut column to anchor against."
        id="overflow"
        note="A long label plus a twenty-item list that scrolls inside the menu."
        title="Overflow — long labels and long lists"
      >
        <Row>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Long label</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-w-64">
              <DropdownMenuItem>{LONG_LABEL}</DropdownMenuItem>
              <DropdownMenuItem>Short</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Twenty items</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {Array.from({ length: 20 }, (_, i) => (
                <DropdownMenuItem key={i}>Region {String(i + 1).padStart(2, "0")}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </State>

      <State
        breaks="Typeahead, which is the part every hand-rolled menu drops. Open the menu below and type “fr”."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Enter / Space / ↓", does: "opens the menu with the first item active." },
            {
              keys: "↑ ↓",
              does: "moves through items, skipping disabled ones and wrapping at the ends.",
            },
            { keys: "type letters", does: "jumps to the first matching item — typeahead." },
            { keys: "Enter", does: "activates the item and closes." },
            { keys: "Escape", does: "closes and returns focus to the trigger." },
          ]}
        >
          <Row>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Choose a region</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Washington, D.C.</DropdownMenuItem>
                <DropdownMenuItem>San Francisco</DropdownMenuItem>
                <DropdownMenuItem>Frankfurt</DropdownMenuItem>
                <DropdownMenuItem disabled>Sydney — at capacity</DropdownMenuItem>
                <DropdownMenuItem>Tokyo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="use-anchored-menu should not exist">
        <p>
          <code>apps/web/src/hooks/use-anchored-menu.ts</code> provides portal-anchored positioning
          for two hand-rolled menus. Everything it does is already here. The census names it as a
          bypass to delete rather than a hook to promote — promoting it would institutionalise the
          bypass.
        </p>
      </Aside>
    </DemoPage>
  );
}
