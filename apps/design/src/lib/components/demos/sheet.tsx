"use client";

import {
  Button,
  Input,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Spinner,
} from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  AxisMatrix,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  LONG_PARAGRAPH,
  Row,
  State,
} from "../demo-kit";

const SIDES = ["top", "right", "bottom", "left", "start", "end"] as const;

export default function SheetDemo() {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A secondary task built as a route change or a Dialog, so the page the user was on disappears. A sheet keeps it in view behind a backdrop."
        code={`<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Edit project</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Edit project</SheetTitle>
      <SheetDescription>Changes apply when you save.</SheetDescription>
    </SheetHeader>
    <SheetBody>
      <Input defaultValue="acme-web" id="name" label="Project name" />
    </SheetBody>
    <SheetFooter>
      <SheetClose asChild>
        <Button variant="outline">Cancel</Button>
      </SheetClose>
      <SheetClose asChild>
        <Button>Save</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>`}
        id="default"
        note="Opens from the right. Tab stays inside; Escape or the close button dismisses it."
        title="Default"
      >
        <Row>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Edit project</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Edit project</SheetTitle>
                <SheetDescription>Changes apply when you save.</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <Input defaultValue="acme-web" id="sheet-default-name" label="Project name" />
              </SheetBody>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline">Cancel</Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button>Save</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Row>
      </State>

      <State
        breaks="A side that slides from the wrong edge, a top and bottom sheet that stretches to the full viewport height instead of capping at its edge height, or start and end sheets that stay on one physical edge in a right-to-left page."
        code={`<SheetContent side="left">…</SheetContent>`}
        id="sides"
        note="One sheet per edge. Top and bottom cap their height; left, right, start and end cap their width and never exceed the viewport. Left and right are physical; start and end are the inline edges and swap under dir=rtl."
        title="Sides"
      >
        <AxisMatrix
          axisName="side"
          defaultValue="right"
          render={(side) => (
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline">
                  Open {side}
                </Button>
              </SheetTrigger>
              <SheetContent side={side as (typeof SIDES)[number]}>
                <SheetHeader>
                  <SheetTitle>From the {side}</SheetTitle>
                  <SheetDescription>Anchored to the {side} edge.</SheetDescription>
                </SheetHeader>
                <SheetBody>
                  <p className="m-0 text-muted-foreground text-sm">
                    Page content stays visible behind the backdrop.
                  </p>
                </SheetBody>
              </SheetContent>
            </Sheet>
          )}
          values={[...SIDES]}
        />
      </State>

      <State
        breaks="A save that leaves the sheet dismissible and the Save button clickable mid-request, so the edit is abandoned or submitted twice. Controlled open lets the page ignore close requests while pending."
        code={`<Sheet onOpenChange={(next) => { if (!saving) setOpen(next); }} open={open}>
  …
  <Button loading={saving} onClick={save}>Save</Button>
</Sheet>`}
        id="loading"
        note="Save puts the sheet into a pending state for a second, then closes it. Escape and the close button are ignored while it is pending."
        title="Loading"
      >
        <Row>
          <Sheet
            onOpenChange={(next) => {
              if (!saving) setOpen(next);
            }}
            open={open}
          >
            <SheetTrigger asChild>
              <Button variant="outline">Save slowly</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Edit project</SheetTitle>
                <SheetDescription>The request takes a moment.</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <Input
                  defaultValue="acme-web"
                  disabled={saving}
                  id="sheet-loading-name"
                  label="Project name"
                />
              </SheetBody>
              <SheetFooter>
                <Button disabled={saving} onClick={() => setOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button
                  loading={saving}
                  onClick={() => {
                    setSaving(true);
                    window.setTimeout(() => {
                      setSaving(false);
                      setOpen(false);
                    }, 1200);
                  }}
                >
                  {saving ? "Saving" : "Save"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Row>
      </State>

      <State
        breaks="An error that replaces the form, so the user loses what they typed, or one that is only shown in colour. Keep the form and say what failed."
        id="error"
        note="The invalid field and the message stay in the body; the footer stays reachable."
        title="Error inside a sheet"
      >
        <Row>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Add domain</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Add domain</SheetTitle>
                <SheetDescription>Point the domain at this project.</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <Input
                  defaultValue="acme.com"
                  error="That domain is already in use by another team."
                  id="sheet-error-domain"
                  label="Domain"
                />
              </SheetBody>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline">Cancel</Button>
                </SheetClose>
                <Button>Add</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Row>
      </State>

      <State
        breaks="A sheet that opens blank while its data loads. Show a pending state or an explicit empty message, never an empty panel."
        id="empty"
        note="Left: opens with an empty message. Right: opens with a pending state."
        title="Empty versus pending on open"
      >
        <Row>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Opens empty</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Activity</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <p className="m-0 text-muted-foreground text-sm">
                  No activity yet. Deploys and edits appear here.
                </p>
              </SheetBody>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Opens pending</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Activity</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Spinner label="Loading activity" size="sm" />
                  Loading activity…
                </div>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </Row>
      </State>

      <State
        breaks="Content taller than the sheet that scrolls the page behind it, or a footer that scrolls away with the body. The body scrolls on its own; header and footer stay put."
        id="overflow"
        note="A long title and a long body. The title wraps beside the close button; only the body scrolls."
        title="Overflow — long content"
      >
        <Row>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Review changes</Button>
            </SheetTrigger>
            <SheetContent className="break-words">
              <SheetHeader>
                <SheetTitle>{LONG_LABEL}</SheetTitle>
                <SheetDescription>Review before you approve.</SheetDescription>
              </SheetHeader>
              <SheetBody>
                {Array.from({ length: 8 }, (_, i) => (
                  <p className="mb-3 text-muted-foreground text-sm" key={i}>
                    {LONG_PARAGRAPH}
                  </p>
                ))}
              </SheetBody>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline">Close</Button>
                </SheetClose>
                <Button>Approve</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Row>
      </State>

      <State
        breaks="A sheet that closes on a stray backdrop click while the user has unsaved input, or one that can never be dismissed by the backdrop when the content is read-only. Sheet ignores backdrop clicks by default; disablePointerDismissal={false} opts in."
        code={`<Sheet disablePointerDismissal={false}>…</Sheet>`}
        id="pointer-dismissal"
        note="Left ignores a backdrop click (the default). Right closes on one."
        title="Backdrop dismissal"
      >
        <Row>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Ignores backdrop</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Unsaved edits</SheetTitle>
                <SheetDescription>Click the backdrop: nothing happens.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Sheet disablePointerDismissal={false}>
            <SheetTrigger asChild>
              <Button variant="outline">Closes on backdrop</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Read-only details</SheetTitle>
                <SheetDescription>Click the backdrop to close this.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </Row>
      </State>

      <State
        breaks="An overlay or close button that cannot be turned off, so a sheet used as a persistent inspector blocks the page, or one with no close button and no footer that can only be left with Escape."
        code={`<SheetContent noOverlay showClose={false}>…</SheetContent>`}
        id="chrome"
        note="Left removes the backdrop (noOverlay). Right removes the built-in close button (showClose={false}) and supplies a footer button instead."
        title="Without overlay or close button"
      >
        <Row>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">No overlay</Button>
            </SheetTrigger>
            <SheetContent noOverlay>
              <SheetHeader>
                <SheetTitle>Inspector</SheetTitle>
                <SheetDescription>No backdrop dims the page.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">No close button</Button>
            </SheetTrigger>
            <SheetContent showClose={false}>
              <SheetHeader>
                <SheetTitle>Terms</SheetTitle>
                <SheetDescription>Close it from the footer or with Escape.</SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <SheetClose asChild>
                  <Button>Done</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Row>
      </State>

      <State
        breaks="A sheet that does not restore focus to its trigger on close, or lets Tab walk out into the page behind it."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Enter / Space",
              does: "on the trigger, opens the sheet and moves focus inside.",
            },
            { keys: "Tab / Shift+Tab", does: "cycles within the sheet only." },
            { keys: "Escape", does: "closes it." },
            { keys: "after close", does: "focus is back on the trigger." },
          ]}
        >
          <Row>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">Open and close me</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Focus restore</SheetTitle>
                  <SheetDescription>
                    Close with Escape and check where the focus ring lands.
                  </SheetDescription>
                </SheetHeader>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button>Done</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Button variant="ghost">Neighbour (should not receive focus)</Button>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="Sheet, Drawer or Dialog">
        <p>
          Sheet is an edge panel for a secondary task on desktop. Use <code>Drawer</code> for a
          touch-first bottom panel with drag-to-dismiss, and <code>Dialog</code> or{" "}
          <code>AlertDialog</code> for a decision that must block. <code>left</code> and{" "}
          <code>right</code> are physical edges and never flip; <code>start</code> and{" "}
          <code>end</code> are the inline edges and mirror in a right-to-left page, sliding in from
          their own edge. The built-in close button sits on the inline end, so it moves to the
          top-left corner in RTL. The panel is portalled to <code>&lt;body&gt;</code>, so the
          direction comes from <code>&lt;html dir&gt;</code> unless you pass <code>dir</code> to{" "}
          <code>SheetContent</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
