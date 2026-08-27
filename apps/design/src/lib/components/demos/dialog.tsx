"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Spinner,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { DEMO_EMAIL_ALT } from "@/lib/demo-fixtures";
import { Aside, DemoPage, KeyboardPath, LONG_PARAGRAPH, Row, State } from "../demo-kit";

export default function DialogDemo() {
  const [submitting, setSubmitting] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A modal that does not trap focus, so Tab walks out into the page behind it."
        id="default"
        note="Open it and Tab around. Focus stays inside; Escape closes."
        title="Default"
      >
        <Row>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Delete workspace</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete workspace</DialogTitle>
                <DialogDescription>
                  This action is permanent. You can archive instead if you need recovery.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive">Delete</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>
      </State>

      <State
        breaks="A submitting dialog that can be dismissed mid-request, or one where the confirm button stays clickable and fires twice. Open it and press Confirm."
        id="submitting"
        note="Confirm puts the dialog into a pending state for a second. Both buttons disable; the dialog stays put."
        title="Submitting"
      >
        <Row>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Transfer project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer project</DialogTitle>
                <DialogDescription>
                  The new owner has to accept before the transfer completes.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Input
                  defaultValue={DEMO_EMAIL_ALT}
                  disabled={submitting}
                  id="dialog-owner"
                  label="New owner"
                />
              </div>
              <DialogFooter>
                <Button disabled={submitting} variant="outline">
                  Cancel
                </Button>
                <Button
                  loading={submitting}
                  onClick={() => {
                    setSubmitting(true);
                    window.setTimeout(() => setSubmitting(false), 1200);
                  }}
                >
                  {submitting ? "Transferring" : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>
      </State>

      <State
        breaks="An error surfaced inside a dialog that pushes the footer off the bottom of the panel, or one that replaces the form so the user loses what they typed."
        id="error"
        note="The error appears above the footer and the form stays intact."
        title="Error inside a dialog"
      >
        <Row>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Add domain</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add domain</DialogTitle>
                <DialogDescription>Point the domain at this project.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <Input
                  defaultValue="acme.com"
                  error={failed ? "That domain is already in use by another team." : false}
                  id="dialog-domain"
                  label="Domain"
                />
                {failed ? (
                  <p className="text-[hsl(var(--destructive-strong))] text-sm">
                    Nothing was saved. Your input is still here.
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={() => setFailed((v) => !v)}>
                  {failed ? "Clear the error" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>
      </State>

      <State
        breaks="Content taller than the viewport that scrolls the page behind the dialog, or a footer that scrolls away with the body so the confirm button becomes unreachable."
        id="overflow"
        note="A long body in a dialog whose body scrolls and whose footer does not."
        title="Overflow — long body"
      >
        <Row>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Review changes</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review changes</DialogTitle>
                <DialogDescription>
                  Provisioning a dedicated single-tenant analytics cluster in Frankfurt
                  (eu-central-1)
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-64 overflow-y-auto py-2 text-muted-foreground text-sm">
                {Array.from({ length: 6 }, (_, i) => (
                  <p className="mb-3" key={i}>
                    {LONG_PARAGRAPH}
                  </p>
                ))}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button>Approve</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>
      </State>

      <State
        breaks="A dialog opened from a busy state that shows an empty panel while it loads. A dialog should not open until it has something to show, or it should show its own pending state — never a blank box."
        id="empty"
        note="Left: opens empty. Right: opens with a pending state. The right one is the contract."
        title="Empty versus pending on open"
      >
        <Row>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost">Opens empty</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deployment details</DialogTitle>
              </DialogHeader>
              <div className="min-h-24" />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Opens pending</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deployment details</DialogTitle>
              </DialogHeader>
              <div className="flex min-h-24 items-center gap-2 text-muted-foreground text-sm">
                <Spinner label="Loading deployment" size="sm" />
                Loading deployment…
              </div>
            </DialogContent>
          </Dialog>
        </Row>
      </State>

      <State
        breaks="A dialog that does not restore focus to its trigger on close — the reader ends up back at the top of the document with no idea where they were."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Enter / Space",
              does: "on the trigger, opens the dialog and moves focus inside.",
            },
            { keys: "Tab / Shift+Tab", does: "cycles within the dialog only." },
            { keys: "Escape", does: "closes it." },
            {
              keys: "after close",
              does: "focus is back on the trigger, not at the top of the page.",
            },
          ]}
        >
          <Row>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Open and close me</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Focus restore</DialogTitle>
                  <DialogDescription>
                    Close with Escape and check where the focus ring lands.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button>Done</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost">Neighbour (should not receive focus)</Button>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="Dialog versus AlertDialog">
        <p>
          <code>AlertDialog</code> is the destructive-confirm variant: it takes no outside-press
          dismissal, so a delete cannot be confirmed away by accident. There are also three
          overlapping confirm implementations in the library (<code>ConfirmDialog</code>,{" "}
          <code>ConfirmDeleteDialog</code>, <code>DestructiveActionModal</code>) and the census
          found that the only one with a story is the one with no consumers. Neither is covered here
          yet; both are on the worklist.
        </p>
      </Aside>
    </DemoPage>
  );
}
