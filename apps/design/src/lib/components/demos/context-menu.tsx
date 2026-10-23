"use client";
// @primitive-exempt: the focusable trigger is a bare button on purpose: it shows asChild wrapping a native control.

import { Copy, Download, Pencil, Trash } from "@nebutra/icons";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, State } from "../demo-kit";

const REGION =
  "flex h-28 w-56 max-w-full items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-muted-foreground text-sm";
const REGIONS = Array.from({ length: 20 }, (_, i) => `Region ${String(i + 1).padStart(2, "0")}`);

function Region({
  children,
  hint = "Right click here",
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className={REGION}>{hint}</ContextMenuTrigger>
      <ContextMenuContent>{children}</ContextMenuContent>
    </ContextMenu>
  );
}

function FileItems({ disableExport = false }: { disableExport?: boolean }) {
  return (
    <ContextMenuGroup>
      <ContextMenuLabel>File</ContextMenuLabel>
      <ContextMenuItem prefix={<Copy />} suffix={<ContextMenuShortcut>⌘C</ContextMenuShortcut>}>
        Copy
      </ContextMenuItem>
      <ContextMenuItem prefix={<Pencil />} suffix={<ContextMenuShortcut>F2</ContextMenuShortcut>}>
        Rename
      </ContextMenuItem>
      <ContextMenuItem disabled={disableExport} prefix={<Download />}>
        Export
      </ContextMenuItem>
    </ContextMenuGroup>
  );
}

function ChoiceItems() {
  const [hidden, setHidden] = React.useState(true);
  const [sort, setSort] = React.useState("Name");
  return (
    <>
      <ContextMenuCheckboxItem checked={hidden} onCheckedChange={setHidden}>
        Show hidden files
      </ContextMenuCheckboxItem>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Sort by</ContextMenuLabel>
        <ContextMenuRadioGroup onValueChange={setSort} value={sort}>
          {["Name", "Date modified", "Size"].map((name) => (
            <ContextMenuRadioItem key={name} value={name}>
              {name}
            </ContextMenuRadioItem>
          ))}
        </ContextMenuRadioGroup>
      </ContextMenuGroup>
    </>
  );
}

export default function ContextMenuDemo() {
  const [action, setAction] = React.useState("No action selected.");

  return (
    <DemoPage>
      <State
        breaks="A custom right-click handler that fights the browser menu or closes on the wrong click. The panel opens at the pointer and closes on Escape, an outside press, or a chosen item."
        code={`<ContextMenu>
  <ContextMenuTrigger className="flex h-28 w-56 items-center justify-center rounded-md border border-dashed border-border">
    Right click here
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem prefix={<Copy />} suffix={<ContextMenuShortcut>⌘C</ContextMenuShortcut>}>
      Copy
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>`}
        id="default"
        note={`Right click the region, or press and hold on a touch screen. ${action}`}
        title="Default"
      >
        <Row align="start">
          <ContextMenu>
            <ContextMenuTrigger className={REGION}>Right click here</ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuGroup>
                <ContextMenuLabel>File</ContextMenuLabel>
                <ContextMenuItem
                  onSelect={() => setAction("Copy selected.")}
                  prefix={<Copy />}
                  suffix={<ContextMenuShortcut>⌘C</ContextMenuShortcut>}
                >
                  Copy
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => setAction("Rename selected.")}
                  prefix={<Pencil />}
                  suffix={<ContextMenuShortcut>F2</ContextMenuShortcut>}
                >
                  Rename
                </ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onSelect={() => setAction("Email link selected.")}>
                    Email link
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => setAction("Copy link selected.")}>
                    Copy link
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuContent>
          </ContextMenu>
        </Row>
      </State>

      <State
        breaks="A destructive item that looks like every other item. It takes the danger colour on rest and on highlight, and sits last, below a separator."
        id="destructive"
        note="Delete uses variant=destructive. Move the highlight onto it and check that the tint stays in the danger tone."
        title="Destructive item"
      >
        <Row align="start">
          <Region>
            <ContextMenuItem prefix={<Copy />}>Duplicate</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              prefix={<Trash />}
              suffix={<ContextMenuShortcut>⌫</ContextMenuShortcut>}
              variant="destructive"
            >
              Delete
            </ContextMenuItem>
          </Region>
        </Row>
      </State>

      <State
        breaks="A checkbox or radio item with no visible indicator. The check and the dot sit in the left gutter that every checkable item reserves."
        id="selection"
        note="A checkbox item and a radio group under a labelled heading. Both are controlled by local state."
        title="Checked and selected items"
      >
        <Row align="start">
          <Region>
            <ChoiceItems />
          </Region>
        </Row>
      </State>

      <State
        breaks="A disabled item that looks live or that takes a press. Export is dimmed and ignores pointer input."
        id="disabled"
        note="Export is disabled; Copy and Rename are not."
        title="Disabled item"
      >
        <Row align="start">
          <Region>
            <FileItems disableExport />
          </Region>
        </Row>
      </State>

      <State
        breaks="A link item that is treated like a button item. With href set the row renders as an anchor, and only the link props apply: disabled and onSelect are not passed through."
        id="link"
        note="The first row is a real link rendered from href; the second is a button row for comparison."
        title="Link item"
      >
        <Row align="start">
          <Region>
            <ContextMenuItem href="#link" prefix={<Download />}>
              Jump to this example
            </ContextMenuItem>
            <ContextMenuItem prefix={<Copy />}>Copy</ContextMenuItem>
          </Region>
        </Row>
      </State>

      <State
        breaks="An empty context menu rendering a bare rounded box on right click. A region with nothing to offer should say so, or not open a menu."
        id="empty"
        note="Left: nothing inside. Right: an explicit disabled row."
        title="Empty"
      >
        <Row align="start">
          <Region hint="Empty">{null}</Region>
          <Region hint="Empty, explained">
            <ContextMenuItem disabled>No actions on a shared file</ContextMenuItem>
          </Region>
        </Row>
      </State>

      <State
        breaks="A long item label that widens the menu past the viewport, or a long list taller than the screen. Labels truncate with an ellipsis at max-w-80; a long list needs its own max height."
        id="overflow"
        note="Left: a long label, truncated. Right: twenty items in a panel capped at max-h-64 that scrolls."
        title="Overflow — long labels and long lists"
      >
        <Row align="start">
          <Region hint="Long label">
            <ContextMenuItem>{LONG_LABEL}</ContextMenuItem>
            <ContextMenuItem>Short</ContextMenuItem>
          </Region>
          <ContextMenu>
            <ContextMenuTrigger className={REGION}>Twenty items</ContextMenuTrigger>
            <ContextMenuContent className="max-h-64 overflow-y-auto">
              {REGIONS.map((region) => (
                <ContextMenuItem key={region}>{region}</ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>
        </Row>
      </State>

      <State
        breaks="Physical padding and offsets in a right-to-left page: the check gutter and the shortcut stay on one physical side regardless of direction. Look at where the indicator and the shortcut land."
        id="rtl"
        note="The same menu under dir=rtl."
        title="Right-to-left"
      >
        <div dir="rtl">
          <Row align="start">
            <Region>
              <FileItems />
              <ContextMenuSeparator />
              <ChoiceItems />
            </Region>
          </Row>
        </div>
      </State>

      <State
        breaks="A trigger a keyboard user can never reach. ContextMenuTrigger renders a plain div that is not focusable, so a menu on it is mouse and touch only. Wrapping a button with asChild gives it a tab stop."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "on the plain region above, nothing: it is not focusable." },
            {
              keys: "Tab",
              does: "on the button below, which is the trigger rendered with asChild, lands focus on it.",
            },
            {
              keys: "Shift+F10 / Menu key",
              does: "on the focused button, asks the browser for its context menu, which opens this one.",
            },
            { keys: "↑ ↓", does: "move through the items; → opens Share, ← closes it." },
            { keys: "type letters", does: "jumps to the first matching item — typeahead." },
            { keys: "Escape", does: "closes the menu." },
          ]}
        >
          <Row align="start">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <button
                  className="rounded-md border border-border bg-card px-4 py-2 text-foreground text-sm"
                  type="button"
                >
                  Focusable trigger
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <FileItems />
                <ContextMenuSeparator />
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem>Email link</ContextMenuItem>
                    <ContextMenuItem>Copy link</ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </ContextMenuContent>
            </ContextMenu>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="ContextMenu versus DropdownMenu">
        <p>
          The item model is the same, but a context menu has no button of its own: the region it
          wraps is the trigger, and the panel opens at the pointer. Use it for secondary actions on
          an object, never as the only way to reach an action, because touch and keyboard users get
          to it by a long press or by a focusable trigger. Use a <code>DropdownMenu</code> when the
          actions need a visible button.
        </p>
      </Aside>
    </DemoPage>
  );
}
