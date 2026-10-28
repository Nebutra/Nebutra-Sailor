"use client";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, Stack, State } from "../demo-kit";

const REGIONS = Array.from({ length: 20 }, (_, i) => `Region ${String(i + 1).padStart(2, "0")}`);

function FileMenu({ disableItem = false }: { disableItem?: boolean }) {
  return (
    <MenubarMenu>
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          New tab
          <MenubarShortcut>⌘T</MenubarShortcut>
        </MenubarItem>
        <MenubarItem>
          New window
          <MenubarShortcut>⌘N</MenubarShortcut>
        </MenubarItem>
        <MenubarItem disabled={disableItem}>New incognito window</MenubarItem>
        <MenubarSeparator />
        <MenubarSub>
          <MenubarSubTrigger>Share</MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem>Email link</MenubarItem>
            <MenubarItem>Messages</MenubarItem>
            <MenubarItem>Notes</MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarSeparator />
        <MenubarItem>
          Print
          <MenubarShortcut>⌘P</MenubarShortcut>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
}

function EditMenu({ disabled = false }: { disabled?: boolean }) {
  return (
    <MenubarMenu>
      <MenubarTrigger disabled={disabled}>Edit</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          Undo
          <MenubarShortcut>⌘Z</MenubarShortcut>
        </MenubarItem>
        <MenubarItem>
          Redo
          <MenubarShortcut>⇧⌘Z</MenubarShortcut>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>Find</MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
}

function ViewMenu() {
  const [bookmarks, setBookmarks] = React.useState(true);
  const [profile, setProfile] = React.useState("Andy");
  return (
    <MenubarMenu>
      <MenubarTrigger>View</MenubarTrigger>
      <MenubarContent>
        <MenubarCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
          Always show bookmarks bar
        </MenubarCheckboxItem>
        <MenubarSeparator />
        <MenubarLabel inset>Profile</MenubarLabel>
        <MenubarRadioGroup onValueChange={setProfile} value={profile}>
          {["Andy", "Benoit", "Luis"].map((name) => (
            <MenubarRadioItem key={name} value={name}>
              {name}
            </MenubarRadioItem>
          ))}
        </MenubarRadioGroup>
      </MenubarContent>
    </MenubarMenu>
  );
}

export default function MenubarDemo() {
  return (
    <DemoPage>
      <State
        breaks="A top-level menu row where each trigger is its own unrelated dropdown. In a menubar, once one menu is open, hovering a sibling trigger switches menus and the arrow keys move between them."
        code={`<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>
        New tab
        <MenubarShortcut>⌘T</MenubarShortcut>
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem>Print</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
  <MenubarMenu>
    <MenubarTrigger>Edit</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>Undo</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>`}
        id="default"
        note="File, Edit and View. Open one, then hover another trigger."
        title="Default"
      >
        <Row align="start">
          <Menubar>
            <FileMenu />
            <EditMenu />
            <ViewMenu />
          </Menubar>
        </Row>
      </State>

      <State
        breaks="A checkbox or radio item with no visible indicator, so the user cannot tell the current setting without toggling it. The check and the dot sit in the left gutter."
        id="selection"
        note="View holds a checkbox item and a radio group. The label is inset to line up with the items under it."
        title="Checked and selected items"
      >
        <Row align="start">
          <Menubar>
            <ViewMenu />
          </Menubar>
        </Row>
      </State>

      <State
        breaks="A disabled item, trigger or bar that still looks live. Each is dimmed and ignores presses."
        id="disabled"
        note="Left: New incognito window is disabled. Middle: the Edit trigger is disabled. Right: the whole bar is disabled."
        title="Disabled"
      >
        <Row align="start">
          <Menubar>
            <FileMenu disableItem />
          </Menubar>
          <Menubar>
            <FileMenu />
            <EditMenu disabled />
          </Menubar>
          <Menubar disabled>
            <FileMenu />
            <EditMenu />
          </Menubar>
        </Row>
      </State>

      <State
        breaks="An empty menu rendering a bare rounded box. A menu with nothing to offer should say so in a disabled row."
        id="empty"
        note="Left: nothing inside. Right: an explicit disabled row."
        title="Empty"
      >
        <Row align="start">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>Empty</MenubarTrigger>
              <MenubarContent />
            </MenubarMenu>
          </Menubar>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>Empty, explained</MenubarTrigger>
              <MenubarContent>
                <MenubarItem disabled>No recent files</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </Row>
      </State>

      <State
        breaks="A long item label that widens the menu past the viewport, or a long list that is taller than the screen and cannot be scrolled. MenubarContent has no maximum height of its own, so a long list needs one."
        id="overflow"
        note="Left: a long label in a menu capped at max-w-64. Right: twenty items in a menu capped at max-h-64 that scrolls."
        title="Overflow — long labels and long lists"
      >
        <Row align="start">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>Long label</MenubarTrigger>
              <MenubarContent className="max-w-64">
                <MenubarItem>{LONG_LABEL}</MenubarItem>
                <MenubarItem>Short</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>Twenty items</MenubarTrigger>
              <MenubarContent className="max-h-64 overflow-y-auto">
                {REGIONS.map((region) => (
                  <MenubarItem key={region}>{region}</MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </Row>
      </State>

      <State
        breaks="A menubar with many top-level menus that wraps to a second line or overflows its container with the last trigger clipped. The bar is a fixed-height single row, so on a narrow screen it has to scroll or the menus have to be fewer."
        id="narrow"
        note="Eight triggers in a 240px container. The bar does not wrap; the stage scrolls."
        title="Many menus in a narrow container"
      >
        <div className="w-60 max-w-full overflow-x-auto">
          <Menubar className="w-max">
            {["File", "Edit", "View", "History", "Bookmarks", "Profiles", "Tab", "Window"].map(
              (name) => (
                <MenubarMenu key={name}>
                  <MenubarTrigger>{name}</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>{name} action</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              ),
            )}
          </Menubar>
        </div>
      </State>

      <State
        breaks="A bar that ignores dir: the check gutter, the submenu chevron and the shortcut stay on the left or right, and the arrow keys still move the wrong way between triggers. Look at which side they land on, then press ArrowLeft on a trigger."
        id="rtl"
        note="The same bar under dir=rtl. The triggers flow right to left and the arrow keys swap (ArrowLeft moves to the next trigger); the item indicators, the Share chevron and the shortcuts follow the direction."
        title="Right-to-left"
      >
        <div dir="rtl">
          <Stack>
            <Menubar>
              <FileMenu />
              <ViewMenu />
            </Menubar>
          </Stack>
        </div>
      </State>

      <State
        breaks="Roving focus that traps Tab inside the bar, or arrow keys that stop at the ends. Tab into the bar below and follow the path."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "← →", does: "move between the triggers, looping at the ends." },
            { keys: "↓ / Enter", does: "opens the focused menu and focuses its first item." },
            { keys: "↑ ↓", does: "move within the open menu." },
            { keys: "→ / ←", does: "on Share, opens the submenu; ← closes it." },
            { keys: "type letters", does: "jumps to the first matching item — typeahead." },
            { keys: "Escape", does: "closes the menu and returns focus to its trigger." },
          ]}
        >
          <Row align="start">
            <Menubar>
              <FileMenu disableItem />
              <EditMenu />
              <ViewMenu />
            </Menubar>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="Menubar versus DropdownMenu">
        <p>
          A <code>Menubar</code> is a row of menus that behave as one control: they share focus, and
          hover hands off between them once one is open. A single button that opens one menu is a{" "}
          <code>DropdownMenu</code>. A bar that only navigates a site is a{" "}
          <code>NavigationMenu</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
