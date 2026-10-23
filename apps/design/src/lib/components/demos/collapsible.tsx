"use client";

import { ChevronDown } from "@nebutra/icons";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  LONG_PARAGRAPH,
  Row,
  Stack,
  State,
} from "../demo-kit";

const PACKAGES = ["@nebutra/ui", "@nebutra/tokens", "@nebutra/icons"];

function Packages() {
  return (
    <ul className="mt-2 grid gap-2 text-muted-foreground text-sm">
      {PACKAGES.map((name) => (
        <li className="rounded-md border border-border px-3 py-2" key={name}>
          {name}
        </li>
      ))}
    </ul>
  );
}

export default function CollapsibleDemo() {
  const [open, setOpen] = React.useState(false);
  const [presses, setPresses] = React.useState(0);

  return (
    <DemoPage>
      <State
        breaks="A trigger with no aria-expanded, or one that does not point at its region. aria-expanded comes from the component; aria-controls and the matching id are yours to pass."
        code={`<Collapsible>
  <CollapsibleTrigger aria-controls="packages" asChild>
    <Button suffix={<ChevronDown />} variant="outline">3 packages</Button>
  </CollapsibleTrigger>
  <CollapsibleContent id="packages">…</CollapsibleContent>
</Collapsible>`}
        id="default"
        note="Closed to start. Press the trigger; the region slides open, and the content is only in the DOM while open."
        title="Default"
      >
        <div className="w-72 max-w-full">
          <Collapsible>
            <CollapsibleTrigger aria-controls="demo-packages" asChild>
              <Button suffix={<ChevronDown />} variant="outline">
                3 packages
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent id="demo-packages">
              <Packages />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </State>

      <State
        breaks="defaultOpen ignored, so a region the page promised to show starts hidden."
        code={`<Collapsible defaultOpen>…</Collapsible>`}
        id="default-open"
        title="Open to start"
      >
        <div className="w-72 max-w-full">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Button suffix={<ChevronDown />} variant="outline">
                3 packages
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Packages />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </State>

      <State
        breaks="A controlled collapsible that toggles its own state instead of the caller's, so the page and the region disagree. The external button and the trigger have to move the same state."
        code={`const [open, setOpen] = useState(false);

<Collapsible onOpenChange={setOpen} open={open}>…</Collapsible>`}
        id="controlled"
        note={`Controlled by the page. State: ${open ? "open" : "closed"}.`}
        title="Controlled"
      >
        <Stack>
          <div className="w-72 max-w-full">
            <Collapsible onOpenChange={setOpen} open={open}>
              <CollapsibleTrigger asChild>
                <Button suffix={<ChevronDown />} variant="outline">
                  3 packages
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Packages />
              </CollapsibleContent>
            </Collapsible>
          </div>
          <Row>
            <Button onClick={() => setOpen((v) => !v)} size="tiny" variant="ghost">
              {open ? "Close from outside" : "Open from outside"}
            </Button>
          </Row>
        </Stack>
      </State>

      <State
        breaks="A disabled collapsible that still toggles, or a disabled bare trigger that looks live. The root's disabled stops the toggle; styling the bare trigger's disabled look is up to its className."
        code={`<Collapsible disabled>…</Collapsible>`}
        id="disabled"
        note="Left: a Button trigger, which brings its own disabled look. Right: a bare trigger whose className adds disabled:opacity-50."
        title="Disabled"
      >
        <Row align="start">
          <div className="w-60">
            <Collapsible disabled>
              <CollapsibleTrigger asChild>
                <Button suffix={<ChevronDown />} variant="outline">
                  3 packages
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Packages />
              </CollapsibleContent>
            </Collapsible>
          </div>
          <div className="w-60">
            <Collapsible disabled>
              <CollapsibleTrigger className="font-medium text-sm underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50">
                3 packages
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Packages />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </Row>
      </State>

      <State
        breaks="An onClick on the trigger that replaces the toggle instead of running beside it. The count goes up and the region opens on the same press."
        code={`<CollapsibleTrigger onClick={() => track("packages")}>3 packages</CollapsibleTrigger>`}
        id="extra-click"
        note={`Your own onClick runs in addition to the toggle. Presses so far: ${presses}.`}
        title="With your own onClick"
      >
        <div className="w-72 max-w-full">
          <Collapsible>
            <CollapsibleTrigger
              className="font-medium text-sm underline-offset-4 hover:underline"
              onClick={() => setPresses((n) => n + 1)}
            >
              3 packages
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Packages />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </State>

      <State
        breaks="A long trigger label that overflows its row, or a long unbroken string in the region that scrolls the page sideways. The region does not truncate: it grows."
        id="overflow"
        note="A long label on the trigger and a long paragraph in the region, in a narrow container."
        title="Overflow — long label and long body"
      >
        <div className="max-w-xs rounded-lg bg-background p-3">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Button
                className="h-auto max-w-full whitespace-normal break-words py-2 text-left"
                suffix={<ChevronDown />}
                variant="outline"
              >
                {LONG_LABEL}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="break-words pt-2 text-muted-foreground text-sm">
              {LONG_PARAGRAPH}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </State>

      <State
        breaks="A region that opens onto nothing. Collapsible does not know its content is empty; the caller has to say so."
        id="empty"
        note="Left: opens to a blank gap. Right: opens to a sentence that says nothing is there."
        title="Empty region"
      >
        <Row align="start">
          <div className="w-60">
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <Button suffix={<ChevronDown />} variant="outline">
                  Environment variables
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>{null}</CollapsibleContent>
            </Collapsible>
          </div>
          <div className="w-60">
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <Button suffix={<ChevronDown />} variant="outline">
                  Environment variables
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="mt-2 text-muted-foreground text-sm">None set for this project.</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </Row>
      </State>

      <State
        breaks="Left and right written physically in the layout around the trigger, so a right-to-left page is mirrored wrongly. The Button's suffix follows the writing direction."
        id="rtl"
        title="Right-to-left"
      >
        <div className="w-72 max-w-full" dir="rtl">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Button suffix={<ChevronDown />} variant="outline">
                3 packages
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Packages />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </State>

      <State
        breaks="A trigger that cannot be reached by keyboard or that does not respond to Space. It is a native button, so it should do both with no extra code."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "moves focus to the trigger. A disabled trigger is skipped." },
            { keys: "Enter / Space", does: "opens or closes the region." },
            {
              keys: "after opening",
              does: "focus stays on the trigger; the content is next in Tab order.",
            },
          ]}
        >
          <div className="w-72 max-w-full">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button suffix={<ChevronDown />} variant="outline">
                  3 packages
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Packages />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </KeyboardPath>
      </State>

      <Aside title="Collapsible versus Accordion">
        <p>
          <code>Collapsible</code> is one region with its own state. For several related sections
          that should share an open state and arrow-key navigation, use <code>Accordion</code>.
          Unlike Accordion, a closed Collapsible removes its content from the DOM, so find-in-page
          will not see it.
        </p>
      </Aside>
    </DemoPage>
  );
}
