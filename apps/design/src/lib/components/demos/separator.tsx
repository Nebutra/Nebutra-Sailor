"use client";

import { Separator } from "@nebutra/ui/primitives";
import { Aside, DemoPage, Row, Specimen, Stack, State, Surface } from "../demo-kit";

export default function SeparatorDemo() {
  return (
    <DemoPage>
      <State
        breaks="A separator that draws at the wrong opacity in one theme. It takes bg-border, so it moves with the theme rather than against it."
        id="orientation"
        note="Horizontal fills its container's width; vertical fills its height, so the parent must have one."
        title="Both orientations"
      >
        <Stack>
          <div className="rounded-lg bg-background p-4">
            <div className="text-sm text-foreground">Above</div>
            <Separator className="my-3" />
            <div className="text-sm text-foreground">Below</div>
          </div>
          <div className="flex h-10 items-center gap-3 rounded-lg bg-background px-4">
            <span className="text-sm text-foreground">Overview</span>
            <Separator orientation="vertical" />
            <span className="text-sm text-foreground">Settings</span>
            <Separator orientation="vertical" />
            <span className="text-sm text-foreground">Members</span>
          </div>
        </Stack>
      </State>

      <State
        breaks="A vertical separator inside a parent with no height. It renders as nothing — the most common way this component silently fails."
        id="zero-height"
        note="The left case has no height on the parent, so the vertical rule collapses. The right case sets one."
        title="Vertical with no height — the silent failure"
      >
        <Row align="start">
          <Specimen label="parent has no height — nothing renders">
            <div className="rounded-lg bg-background p-4">
              <Separator orientation="vertical" />
            </div>
          </Specimen>
          <Specimen label="h-8 on the parent">
            <div className="flex h-8 rounded-lg bg-background p-4">
              <Separator orientation="vertical" />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="Nothing — this is the comparison the design language actually asks for."
        id="alternative"
        note="The same two-group list, separated three ways. The recommended treatment in this system is spacing plus a tonal background shift, not a rule."
        title="Separator versus spacing versus tint"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="mb-2 font-mono text-[11px] text-muted-foreground">rule</div>
            <div className="rounded-lg bg-background p-4 text-sm text-foreground">
              <div>Production</div>
              <Separator className="my-2" />
              <div>Preview</div>
            </div>
          </div>
          <div>
            <div className="mb-2 font-mono text-[11px] text-muted-foreground">spacing only</div>
            <div className="rounded-lg bg-background p-4 text-sm text-foreground">
              <div className="pb-4">Production</div>
              <div>Preview</div>
            </div>
          </div>
          <div>
            <div className="mb-2 font-mono text-[11px] text-muted-foreground">tonal shift</div>
            <div className="rounded-lg bg-background p-1 text-sm text-foreground">
              <div className="rounded-md p-3">Production</div>
              <div className="rounded-md bg-muted/50 p-3">Preview</div>
            </div>
          </div>
        </div>
      </State>

      <State
        breaks="A separator that is announced by a screen reader as a meaningful divider when it is purely visual."
        id="semantics"
        note="decorative defaults to true, which is the right default: most separators carry no information a screen reader needs."
        title="Semantics"
      >
        <Surface className="bg-background">
          <Stack>
            <div className="text-sm text-foreground">decorative (default) — not announced</div>
            <Separator />
            <div className="text-sm text-foreground">
              decorative={"{false}"} — announced as a separator
            </div>
            <Separator decorative={false} />
          </Stack>
        </Surface>
      </State>

      <Aside title="There is no keyboard path, and no loading, empty or error state">
        <p>
          Separator is a one-pixel rule. It is not focusable, has no data, and cannot be in flight
          or in error. Listing those states as absent is more useful than inventing them: the states
          that break it are the two above — a vertical rule with no height, and a theme where{" "}
          <code>--border</code> moved without this being rechecked.
        </p>
      </Aside>
    </DemoPage>
  );
}
