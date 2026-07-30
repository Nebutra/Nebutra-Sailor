"use client";

import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, ControlButton, Controls, DemoPage, KeyboardPath, Row, State } from "../demo-kit";

export default function PopoverDemo() {
  const [phase, setPhase] = React.useState<"ready" | "loading" | "empty" | "error">("ready");

  return (
    <DemoPage>
      <State
        breaks="A hand-rolled anchored menu. This primitive already handles anchoring, the focus trap, Escape and outside-press; seven app-side menus reimplemented all four."
        id="default"
        note="Click the trigger. Focus moves into the panel and returns to the trigger on close."
        title="Default"
      >
        <Row>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">Open popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4">
              <p className="font-medium text-foreground text-sm">API key scope</p>
              <p className="mt-2 text-muted-foreground text-xs">
                Restrict this key to analytics read-only access.
              </p>
            </PopoverContent>
          </Popover>
        </Row>
      </State>

      <State
        breaks="A panel whose alignment changes its width, or one that opens off the side of a narrow viewport instead of flipping."
        id="alignment"
        note="Three alignments against the same trigger row. The middle one sits near the container edge on purpose."
        title="Alignment and collision"
      >
        <div className="flex justify-between rounded-lg bg-background p-3">
          {(["start", "center", "end"] as const).map((align) => (
            <Popover key={align}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  align={align}
                </Button>
              </PopoverTrigger>
              <PopoverContent align={align} className="w-56 p-3">
                <p className="text-foreground text-sm">Aligned {align}.</p>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      </State>

      <State
        breaks="The three states a popover with fetched content lives in. A panel that resizes as content arrives makes the whole page jump; one that shows a blank box on an empty result reads as broken. Switch the phase, then open the panel."
        id="phases"
        note="Loading, empty, error and ready — all in the same fixed-height panel so the size does not change under the pointer."
        title="Loading, empty and error content"
      >
        <Controls>
          {(["ready", "loading", "empty", "error"] as const).map((next) => (
            <ControlButton active={phase === next} key={next} onClick={() => setPhase(next)}>
              {next}
            </ControlButton>
          ))}
        </Controls>
        <Row>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">Recent deployments</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4">
              <div className="flex min-h-24 flex-col justify-center">
                {phase === "loading" ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Spinner label="Loading deployments" size="sm" />
                    Loading deployments…
                  </div>
                ) : null}
                {phase === "empty" ? (
                  <p className="text-muted-foreground text-sm">
                    This project has not been deployed yet. Push to <code>main</code> to start.
                  </p>
                ) : null}
                {phase === "error" ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[hsl(var(--destructive-strong))] text-sm">
                      Could not reach the deployments API.
                    </p>
                    <Button size="sm" variant="outline">
                      Retry
                    </Button>
                  </div>
                ) : null}
                {phase === "ready" ? (
                  <ul className="flex flex-col gap-1.5 text-foreground text-sm">
                    <li>a1b2c3d — Ready</li>
                    <li>9f8e7d6 — Ready</li>
                    <li>4c5b6a7 — Building</li>
                  </ul>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        </Row>
      </State>

      <State
        breaks="A panel taller than the viewport that pushes the page instead of scrolling inside itself."
        id="overflow"
        note="Twenty rows in a panel with its own max height and scroll."
        title="Overflow — long content"
      >
        <Row>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">All regions</Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-64 w-64 overflow-y-auto p-2">
              <ul className="flex flex-col">
                {Array.from({ length: 20 }, (_, i) => (
                  <li className="rounded px-2 py-1.5 text-foreground text-sm" key={i}>
                    Region {String(i + 1).padStart(2, "0")} — eu-central-{i + 1}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </Row>
      </State>

      <State
        breaks="A panel with a form inside it that closes on the first Escape while a field is still focused, or one that never returns focus to the trigger."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "focuses the trigger." },
            { keys: "Enter / Space", does: "opens the panel and moves focus inside it." },
            { keys: "Tab", does: "cycles within the panel — focus is trapped while it is open." },
            { keys: "Escape", does: "closes the panel and returns focus to the trigger." },
            { keys: "click outside", does: "does the same." },
          ]}
        >
          <Row>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary">Rename project</Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4">
                <div className="flex flex-col gap-3">
                  <Input defaultValue="acme-analytics" id="popover-rename" label="Project name" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline">
                      Cancel
                    </Button>
                    <Button size="sm">Save</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="Popover, Dialog or DropdownMenu">
        <p>
          Popover is for a non-modal panel anchored to a trigger. Use <code>DropdownMenu</code> when
          the contents are a list of commands — it brings menu semantics and typeahead. Use{" "}
          <code>Dialog</code> when the task must block the page. Reaching for a Popover and then
          adding roles by hand is how the app-side menus this primitive replaces came about.
        </p>
      </Aside>
    </DemoPage>
  );
}
