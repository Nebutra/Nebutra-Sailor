"use client";

import {
  Button,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandResults,
  CommandSeparator,
  CommandShortcut,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, Stack, State } from "../demo-kit";

const FRAME = "w-72 max-w-full border border-border";
const REGIONS = Array.from({ length: 40 }, (_, i) => `Region ${String(i + 1).padStart(2, "0")}`);
const PEOPLE = ["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Margaret Hamilton"];

function Palette({
  className = FRAME,
  initialSearch = "",
  disableItem = false,
  disableInput = false,
  empty = "No results found.",
}: {
  className?: string;
  initialSearch?: string;
  disableItem?: boolean;
  disableInput?: boolean;
  empty?: React.ReactNode;
}) {
  const [search, setSearch] = React.useState(initialSearch);
  return (
    <Command className={className}>
      <CommandInput
        disabled={disableInput}
        onValueChange={setSearch}
        placeholder="Type a command or search..."
        value={search}
      />
      <CommandList>
        <CommandEmpty>{empty}</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search emoji</CommandItem>
          <CommandItem disabled={disableItem}>Calculator</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            Profile
            <CommandShortcut keys={["⌘", "P"]} label="Command P" />
          </CommandItem>
          <CommandItem>
            Billing
            <CommandShortcut keys={["⌘", "B"]} label="Command B" />
          </CommandItem>
          <CommandItem>
            Settings
            <CommandShortcut keys={["⌘", "S"]} label="Command S" />
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

/**
 * Filters in app code and tells the live region the count, the way a server-side or
 * custom ranking has to: `shouldFilter` is off, so cmdk lists whatever it is given.
 */
function AnnouncedPalette() {
  const [search, setSearch] = React.useState("");
  const matches = PEOPLE.filter((name) => name.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <Stack className="w-72 max-w-full">
      <Command className={FRAME} shouldFilter={false}>
        <CommandInput onValueChange={setSearch} placeholder="Find a person..." value={search} />
        <CommandList>
          {matches.length === 0 ? <CommandEmpty>No people match.</CommandEmpty> : null}
          <CommandGroup heading="People">
            {matches.map((name) => (
              <CommandItem key={name} value={name}>
                {name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <CommandResults count={matches.length} search={search} />
      </Command>
      <p className="text-muted-foreground text-sm">
        Announced: {matches.length} command results available
        {search.trim() ? ` for ${search}` : ""}.
      </p>
    </Stack>
  );
}

export default function CommandDemo() {
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState("Nothing chosen yet.");

  return (
    <DemoPage>
      <State
        breaks="A palette whose highlighted row is not visible, so Enter runs something the user cannot see. The first row should already be highlighted when it opens."
        code={`<Command className="border border-border">
  <CommandInput placeholder="Type a command or search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Calendar</CommandItem>
      <CommandItem>Search emoji</CommandItem>
    </CommandGroup>
    <CommandSeparator />
    <CommandGroup heading="Settings">
      <CommandItem>
        Profile
        <CommandShortcut keys={["⌘", "P"]} label="Command P" />
      </CommandItem>
    </CommandGroup>
  </CommandList>
</Command>`}
        id="default"
        note="Groups, a separator and shortcut hints. Calendar is highlighted on open; hover or the arrow keys move the highlight."
        title="Default"
      >
        <Row align="start">
          <Palette />
        </Row>
      </State>

      <State
        breaks="A filter that leaves an empty group heading behind, or a separator stranded between two hidden groups. While a query is active the headings of groups with no match and the separators go away."
        id="filtered"
        note="Left: the query “set” is typed in. Only Settings matches, so the Suggestions heading and the separator are gone."
        title="Filtered"
      >
        <Row align="start">
          <Palette initialSearch="set" />
        </Row>
      </State>

      <State
        breaks="A search with no matches that leaves a blank box. CommandEmpty is the only thing telling the user the list is empty, not broken."
        id="empty"
        note="Left: a query nothing matches, with the default message. Right: a message that tells the user what to try."
        title="Empty"
      >
        <Row align="start">
          <Palette initialSearch="zzz" />
          <Palette
            empty="Nothing called “zzz”. Try a shorter search, or press Escape to clear it."
            initialSearch="zzz"
          />
        </Row>
      </State>

      <State
        breaks="A disabled row that looks enabled, or one the arrow keys land on. Calculator is dimmed and skipped; a disabled input is dimmed and takes no typing."
        id="disabled"
        note="Left: Calculator is disabled. Right: the whole input is disabled, so the list cannot be filtered."
        title="Disabled"
      >
        <Row align="start">
          <Palette disableItem />
          <Palette disableInput />
        </Row>
      </State>

      <State
        breaks="A palette in a dialog that does not close when a row is chosen, or that traps the user because Escape does nothing. CommandDialog is a modal Dialog around a Command."
        code={`<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Type a command or search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Actions">
      <CommandItem onSelect={() => setOpen(false)}>New file</CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>`}
        id="dialog"
        note={`Open it, pick a row, and it closes. ${picked}`}
        title="In a dialog"
      >
        <Row>
          <Button onClick={() => setOpen(true)} variant="outline">
            Open command palette
          </Button>
          <CommandDialog onOpenChange={setOpen} open={open}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Actions">
                {["New file", "Open folder", "Toggle theme"].map((label) => (
                  <CommandItem
                    key={label}
                    onSelect={() => {
                      setPicked(`Last chosen: ${label}.`);
                      setOpen(false);
                    }}
                  >
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </Row>
      </State>

      <State
        breaks="A long label that pushes the shortcut off the row, or a long list that grows the palette past the viewport instead of scrolling inside it."
        id="overflow"
        note="Left: a long label next to a shortcut; it wraps and the shortcut stays on the row. Right: forty items scroll inside the 300px list."
        title="Overflow — long labels and long lists"
      >
        <Row align="start">
          <Command className={FRAME}>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandGroup heading="Jobs">
                <CommandItem>
                  {LONG_LABEL}
                  <CommandShortcut keys={["⌘", "J"]} label="Command J" />
                </CommandItem>
                <CommandItem>Short</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
          <Command className={FRAME}>
            <CommandInput placeholder="Search regions..." />
            <CommandList>
              <CommandEmpty>No region found.</CommandEmpty>
              <CommandGroup heading="Regions">
                {REGIONS.map((region) => (
                  <CommandItem key={region}>{region}</CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </Row>
      </State>

      <State
        breaks="Filtering done outside cmdk with no announcement. A screen reader hears nothing when the list changes unless the live region is told the count."
        code={`<Command shouldFilter={false}>
  <CommandInput value={search} onValueChange={setSearch} />
  <CommandList>{/* render only the matches */}</CommandList>
  <CommandResults count={matches.length} search={search} />
</Command>`}
        id="announced"
        note="shouldFilter is off and the page filters the list itself. CommandResults is visually hidden; the line under the palette mirrors what it announces."
        title="Announcing results"
      >
        <AnnouncedPalette />
      </State>

      <State
        breaks="Physical margins in a right-to-left page: the search icon gap and the shortcut sit on the wrong side, because the component uses ml and mr rather than logical properties. Check where the icon and the shortcut land."
        id="rtl"
        note="The same palette under dir=rtl. The text and the list flip; look at the gap between the icon and the field and at which edge the shortcut sits."
        title="Right-to-left"
      >
        <div dir="rtl">
          <Palette />
        </div>
      </State>

      <State
        breaks="Arrow keys that stop at the ends, or that land on a disabled row. Open the palette below, type to filter, then walk the list."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "type",
              does: "filters the list; the first match becomes the highlighted row.",
            },
            { keys: "↑ ↓", does: "moves the highlight, skipping disabled rows." },
            { keys: "Home / End", does: "jumps to the first or last row." },
            { keys: "Enter", does: "runs the highlighted row." },
            { keys: "Escape", does: "closes the palette when it is in a dialog." },
          ]}
        >
          <Row align="start">
            <Palette disableItem />
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="Command versus CommandMenu">
        <p>
          This page covers the cmdk primitive. <code>CommandMenu</code> is a separate, higher-level
          export with its own parts file; it is not documented here. <code>CommandDialog</code> only
          forwards <code>Dialog</code> props, so <code>loop</code> and <code>shouldFilter</code>{" "}
          cannot be set on a palette in a dialog.
        </p>
      </Aside>
    </DemoPage>
  );
}
