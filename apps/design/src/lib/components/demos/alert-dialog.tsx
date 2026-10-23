"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, LONG_PARAGRAPH, Row, State } from "../demo-kit";

export default function AlertDialogDemo() {
  const [typed, setTyped] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A destructive confirm that closes when the backdrop is clicked, so a stray click both dismisses the question and leaves the user unsure whether anything was deleted."
        code={`<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline">Delete project</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete acme-web?</AlertDialogTitle>
      <AlertDialogDescription>
        This permanently deletes the project and its deployments.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction asChild>
        <Button variant="destructive">Delete project</Button>
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`}
        id="default"
        note="Open it and click the backdrop: nothing happens. Only Cancel, the action or Escape closes it."
        title="Default"
      >
        <Row>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Delete project</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete acme-web?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the project and its deployments. It cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive">Delete project</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </State>

      <State
        breaks="A non-destructive confirm styled as destructive, which teaches users to read red as routine. Without asChild the action renders the default button, so only a real destructive action should opt in to the destructive variant."
        code={`<AlertDialogFooter>
  <AlertDialogCancel>Keep editing</AlertDialogCancel>
  <AlertDialogAction>Discard draft</AlertDialogAction>
</AlertDialogFooter>`}
        id="plain-action"
        note="With no asChild the action renders as the default button and Cancel as the outline button."
        title="Plain action"
      >
        <Row>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Discard draft</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your unsaved changes to the release notes will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction>Discard draft</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </State>

      <State
        breaks="A type-to-confirm field that leaves the action enabled, or one that keeps the old text when the dialog is reopened and so arrives pre-confirmed."
        code={`<Input label="Type acme-web to confirm" onValueChange={setTyped} value={typed} />
<AlertDialogAction asChild>
  <Button disabled={typed !== "acme-web"} variant="destructive">
    Delete project
  </Button>
</AlertDialogAction>`}
        id="disabled"
        note="The action stays disabled until the name matches exactly. The text is cleared each time the dialog opens."
        title="Disabled until confirmed"
      >
        <Row>
          <AlertDialog
            onOpenChange={(next) => {
              if (next) setTyped("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="outline">Delete with confirmation</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete acme-web?</AlertDialogTitle>
                <AlertDialogDescription>
                  Type the project name to enable the delete button.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                id="alert-dialog-confirm"
                label="Type acme-web to confirm"
                onValueChange={setTyped}
                value={typed}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button disabled={typed !== "acme-web"} variant="destructive">
                    Delete project
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </State>

      <State
        breaks="A confirm that can be dismissed with Escape or Cancel while its request is in flight, or whose action stays clickable and fires twice. Controlled open lets the page ignore close requests while pending."
        code={`<AlertDialog
  onOpenChange={(next) => {
    if (!submitting) setOpen(next);
  }}
  open={open}
>
  …
  <AlertDialogCancel asChild>
    <Button disabled={submitting} variant="outline">Cancel</Button>
  </AlertDialogCancel>
  <Button loading={submitting} onClick={confirm} variant="destructive">Delete project</Button>
</AlertDialog>`}
        id="loading"
        note="Delete puts the dialog into a pending state for a second, then closes it. Escape and Cancel are ignored while it is pending."
        title="Loading"
      >
        <Row>
          <AlertDialog
            onOpenChange={(next) => {
              if (!submitting) setOpen(next);
            }}
            open={open}
          >
            <AlertDialogTrigger asChild>
              <Button variant="outline">Delete and wait</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete acme-web?</AlertDialogTitle>
                <AlertDialogDescription>
                  Deleting removes every deployment, which can take a moment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button disabled={submitting} variant="outline">
                    Cancel
                  </Button>
                </AlertDialogCancel>
                <Button
                  loading={submitting}
                  onClick={() => {
                    setSubmitting(true);
                    window.setTimeout(() => {
                      setSubmitting(false);
                      setOpen(false);
                    }, 1200);
                  }}
                  variant="destructive"
                >
                  {submitting ? "Deleting" : "Delete project"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </State>

      <State
        breaks="A long title or description that overflows the panel horizontally, or a long body that pushes the footer buttons off the bottom so they cannot be reached."
        id="overflow"
        note="A long title and a long paragraph in a dialog capped to the viewport width. The text wraps; the footer stays inside the panel."
        title="Overflow — long text"
      >
        <Row>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Long content</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100vw-2rem)] break-words">
              <AlertDialogHeader>
                <AlertDialogTitle>{LONG_LABEL}</AlertDialogTitle>
                <AlertDialogDescription>{LONG_PARAGRAPH}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Promote anyway</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </State>

      <State
        breaks="A dialog that does not return focus to its trigger on close, or that lets Tab walk out into the page behind it."
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
            { keys: "Escape", does: "closes it without confirming." },
            { keys: "click outside", does: "does nothing: pointer dismissal is off." },
            { keys: "after close", does: "focus is back on the trigger." },
          ]}
        >
          <Row>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary">Open and close me</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Focus restore</AlertDialogTitle>
                  <AlertDialogDescription>
                    Close with Escape and check where the focus ring lands.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Done</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost">Neighbour (should not receive focus)</Button>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="AlertDialog versus Dialog">
        <p>
          Use <code>AlertDialog</code> for a decision the user must answer before anything else
          happens. Use <code>Dialog</code> when the content is a task the user can walk away from.
          An alert dialog has no empty state, no error state and no close icon of its own: show an
          error in the page after it closes, or keep it open and put the message in the body.
        </p>
      </Aside>
    </DemoPage>
  );
}
