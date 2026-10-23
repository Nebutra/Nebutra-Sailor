"use client";

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Input,
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

const DIRECTIONS = ["bottom", "top", "right", "left"] as const;

export default function DrawerDemo() {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A mobile action panel built as a centred Dialog, which sits mid-screen out of thumb reach and cannot be dragged away. A bottom drawer is reachable and dismisses with a swipe."
        code={`<Drawer>
  <DrawerTrigger asChild>
    <Button variant="outline">Open drawer</Button>
  </DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Release notes</DrawerTitle>
      <DrawerDescription>What changed in this version.</DrawerDescription>
    </DrawerHeader>
    <DrawerBody>
      <p>Faster builds and a new project overview.</p>
    </DrawerBody>
    <DrawerFooter>
      <DrawerClose asChild>
        <Button variant="outline">Close</Button>
      </DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>`}
        id="default"
        note="Opens from the bottom with a drag handle. Drag down, press Escape or use Close to dismiss it."
        title="Default"
      >
        <Row>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Open drawer</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Release notes</DrawerTitle>
                <DrawerDescription>What changed in this version.</DrawerDescription>
              </DrawerHeader>
              <DrawerBody>
                <p className="m-0 text-muted-foreground text-sm">
                  Faster builds and a new project overview.
                </p>
              </DrawerBody>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">Close</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Row>
      </State>

      <State
        breaks="A direction that slides from the wrong edge, or a drag handle drawn on a side drawer where there is nothing to drag down. The handle shows only on bottom drawers."
        code={`<Drawer direction="right">…</Drawer>`}
        id="directions"
        note="One drawer per edge. Left and right cap their width at 24rem or the viewport minus 2rem."
        title="Directions"
      >
        <AxisMatrix
          axisName="direction"
          defaultValue="bottom"
          render={(direction) => (
            <Drawer direction={direction as (typeof DIRECTIONS)[number]}>
              <DrawerTrigger asChild>
                <Button size="sm" variant="outline">
                  Open {direction}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>From the {direction}</DrawerTitle>
                  <DrawerDescription>Anchored to the {direction} edge.</DrawerDescription>
                </DrawerHeader>
                <DrawerBody>
                  <p className="m-0 text-muted-foreground text-sm">
                    Page content stays visible behind the backdrop.
                  </p>
                </DrawerBody>
              </DrawerContent>
            </Drawer>
          )}
          values={[...DIRECTIONS]}
        />
      </State>

      <State
        breaks="A fixed height that is ignored, or a taller value that pushes the drawer off a short viewport. Height is capped to the viewport minus 1rem. Numbers resolve to px; strings pass through as CSS."
        code={`<Drawer height={320}>…</Drawer>
<Drawer height="60vh">…</Drawer>`}
        id="height"
        note="A 320px drawer, a 60vh drawer and one with no height that sizes to its content."
        title="Height"
      >
        <Row>
          {[
            { label: "height={320}", height: 320 },
            { label: 'height="60vh"', height: "60vh" },
          ].map((item) => (
            <Drawer height={item.height} key={item.label}>
              <DrawerTrigger asChild>
                <Button variant="outline">{item.label}</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Fixed height</DrawerTitle>
                  <DrawerDescription>{item.label}</DrawerDescription>
                </DrawerHeader>
                <DrawerBody>
                  <p className="m-0 text-muted-foreground text-sm">
                    The body fills the remaining height and scrolls if it must.
                  </p>
                </DrawerBody>
              </DrawerContent>
            </Drawer>
          ))}
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">No height</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Sized to content</DrawerTitle>
                <DrawerDescription>No height prop.</DrawerDescription>
              </DrawerHeader>
            </DrawerContent>
          </Drawer>
        </Row>
      </State>

      <State
        breaks="A save that leaves the drawer swipeable and its button clickable mid-request, so the edit is abandoned or submitted twice. dismissible={false} turns off swipe, Escape and outside press while pending."
        code={`<Drawer dismissible={!saving} onOpenChange={setOpen} open={open}>
  …
  <Button loading={saving} onClick={save}>Save</Button>
</Drawer>`}
        id="loading"
        note="Save puts the drawer into a pending state for a second, then closes it. Swipe, Escape and outside press are all off while it is pending."
        title="Loading"
      >
        <Row>
          <Drawer dismissible={!saving} onOpenChange={setOpen} open={open}>
            <DrawerTrigger asChild>
              <Button variant="outline">Save slowly</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Edit project</DrawerTitle>
                <DrawerDescription>The request takes a moment.</DrawerDescription>
              </DrawerHeader>
              <DrawerBody>
                <Input
                  defaultValue="acme-web"
                  disabled={saving}
                  id="drawer-loading-name"
                  label="Project name"
                />
              </DrawerBody>
              <DrawerFooter>
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
                <Button disabled={saving} onClick={() => setOpen(false)} variant="outline">
                  Cancel
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Row>
      </State>

      <State
        breaks="An error that replaces the form, so the user loses what they typed. Keep the field and say what failed."
        id="error"
        note="The invalid field and its message stay in the body; the footer stays reachable."
        title="Error inside a drawer"
      >
        <Row>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Add domain</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Add domain</DrawerTitle>
                <DrawerDescription>Point the domain at this project.</DrawerDescription>
              </DrawerHeader>
              <DrawerBody>
                <Input
                  defaultValue="acme.com"
                  error="That domain is already in use by another team."
                  id="drawer-error-domain"
                  label="Domain"
                />
              </DrawerBody>
              <DrawerFooter>
                <Button>Add</Button>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Row>
      </State>

      <State
        breaks="A drawer that opens blank while its data loads. Show a pending state or an explicit empty message, never an empty panel."
        id="empty"
        note="Left: opens with an empty message. Right: opens with a pending state."
        title="Empty versus pending on open"
      >
        <Row>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Opens empty</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Activity</DrawerTitle>
                <DrawerDescription>Recent deploys and edits.</DrawerDescription>
              </DrawerHeader>
              <DrawerBody>
                <p className="m-0 text-muted-foreground text-sm">No activity yet.</p>
              </DrawerBody>
            </DrawerContent>
          </Drawer>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Opens pending</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Activity</DrawerTitle>
                <DrawerDescription>Recent deploys and edits.</DrawerDescription>
              </DrawerHeader>
              <DrawerBody>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Spinner label="Loading activity" size="sm" />
                  Loading activity…
                </div>
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        </Row>
      </State>

      <State
        breaks="Content taller than the drawer that scrolls the page behind it, or a footer that scrolls away with the body. The body scrolls on its own on bottom and top drawers; header and footer stay put."
        id="overflow"
        note="A long title and a long body. Only the body scrolls."
        title="Overflow — long content"
      >
        <Row>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Review changes</Button>
            </DrawerTrigger>
            <DrawerContent className="break-words">
              <DrawerHeader>
                <DrawerTitle>{LONG_LABEL}</DrawerTitle>
                <DrawerDescription>Review before you approve.</DrawerDescription>
              </DrawerHeader>
              <DrawerBody>
                {Array.from({ length: 8 }, (_, i) => (
                  <p className="mb-3 text-muted-foreground text-sm" key={i}>
                    {LONG_PARAGRAPH}
                  </p>
                ))}
              </DrawerBody>
              <DrawerFooter>
                <Button>Approve</Button>
                <DrawerClose asChild>
                  <Button variant="outline">Close</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Row>
      </State>

      <State
        breaks="A drawer that cannot be dismissed at all, so a user without a swipe gesture or a mouse is trapped, or one marked dismissible={false} with no close control."
        code={`<Drawer dismissible={false}>…</Drawer>`}
        id="not-dismissible"
        note="Swipe, Escape and outside press do nothing. The footer button is the only way out, so it must always be present."
        title="Not dismissible"
      >
        <Row>
          <Drawer dismissible={false}>
            <DrawerTrigger asChild>
              <Button variant="outline">Required step</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Accept the terms</DrawerTitle>
                <DrawerDescription>You must answer before continuing.</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button>Accept</Button>
                </DrawerClose>
                <DrawerClose asChild>
                  <Button variant="outline">Decline</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Row>
      </State>

      <State
        breaks="A drawer that does not restore focus to its trigger on close, or lets Tab walk out into the page behind it."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Enter / Space",
              does: "on the trigger, opens the drawer and moves focus inside.",
            },
            { keys: "Tab / Shift+Tab", does: "cycles within the drawer only." },
            { keys: "Escape", does: "closes it." },
            { keys: "drag down", does: "on a bottom drawer, dismisses it with a swipe." },
            { keys: "after close", does: "focus is back on the trigger." },
          ]}
        >
          <Row>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="secondary">Open and close me</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Focus restore</DrawerTitle>
                  <DrawerDescription>
                    Close with Escape and check where the focus ring lands.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button>Done</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            <Button variant="ghost">Neighbour (should not receive focus)</Button>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="Drawer, Sheet or Dialog">
        <p>
          Drawer is the touch-first bottom panel, built on Vaul, with drag-to-dismiss. Use{" "}
          <code>Sheet</code> for a lateral desktop panel and <code>Dialog</code> or{" "}
          <code>AlertDialog</code> for a blocking decision. Drawer layers its backdrop and panel at
          z-index 50, below the 1040 and 1050 that Sheet and Dialog use, so a Drawer opened beneath
          one of those cannot be stacked above it. The header text is centred whatever the
          direction.
        </p>
      </Aside>
    </DemoPage>
  );
}
