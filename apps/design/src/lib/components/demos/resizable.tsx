"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Stack, State } from "../demo-kit";

function Pane({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      className={`flex h-full items-center justify-center p-4 ${muted ? "bg-muted/40 text-muted-foreground" : ""}`}
    >
      {children}
    </div>
  );
}

const FRAME = "rounded-lg border border-border";

/** Echoes the layout the group reports once a drag or key press settles. */
function SavedLayout() {
  const [layout, setLayout] = React.useState<Record<string, number> | null>(null);
  return (
    <Stack>
      <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`} onLayoutChanged={setLayout}>
        <ResizablePanel defaultSize="35%" id="files" minSize="20%">
          <Pane muted>Files</Pane>
        </ResizablePanel>
        <ResizableHandle aria-label="Resize files" withHandle />
        <ResizablePanel defaultSize="65%" id="editor">
          <Pane>Editor</Pane>
        </ResizablePanel>
      </ResizablePanelGroup>
      <pre className="m-0 font-mono text-muted-foreground text-xs">
        {layout
          ? JSON.stringify(
              Object.fromEntries(Object.entries(layout).map(([id, v]) => [id, Math.round(v)])),
            )
          : "Resize to see the layout object"}
      </pre>
    </Stack>
  );
}

export default function ResizableDemo() {
  return (
    <DemoPage>
      <State
        breaks="A divider that cannot be seen or reached, so the split looks static. The hairline is 1px wide; the hit area has to be larger than what is drawn."
        code={`<ResizablePanelGroup className="h-40 w-full rounded-lg border border-border">
  <ResizablePanel defaultSize="30%" minSize="15%">
    <div className="p-4">Sidebar</div>
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize="70%">
    <div className="p-4">Main</div>
  </ResizablePanel>
</ResizablePanelGroup>`}
        id="default"
        note="Drag the grip or the hairline. Sizes are percentage strings: a bare number means pixels in react-resizable-panels v4."
        title="Two panes with a grip"
      >
        <ResizablePanelGroup className={`h-40 w-full max-w-xl ${FRAME}`}>
          <ResizablePanel defaultSize="30%" minSize="15%">
            <Pane muted>Sidebar</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize sidebar" withHandle />
          <ResizablePanel defaultSize="70%">
            <Pane>Main</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="A divider without a grip that is too thin to find, or that has no keyboard focus. Without withHandle the only affordance is the 1px line and the cursor change."
        id="no-grip"
        note="withHandle is off by default. The divider is still a focusable separator; Tab to it."
        title="Hairline only"
      >
        <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`}>
          <ResizablePanel defaultSize="50%">
            <Pane muted>Left</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize left" />
          <ResizablePanel defaultSize="50%">
            <Pane>Right</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="Vertical groups styled with the horizontal divider: a 1px-wide, zero-height separator with no visible line and a grip that is not rotated."
        code={`<ResizablePanelGroup orientation="vertical" className="h-64 w-full rounded-lg border border-border">
  <ResizablePanel defaultSize="60%" minSize="25%">…</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize="40%">…</ResizablePanel>
</ResizablePanelGroup>`}
        id="vertical"
        note="orientation=vertical stacks the panels. The divider turns horizontal and the grip rotates. The older direction prop still works but is deprecated."
        title="Vertical"
      >
        <ResizablePanelGroup className={`h-64 w-full max-w-xl ${FRAME}`} orientation="vertical">
          <ResizablePanel defaultSize="60%" minSize="25%">
            <Pane>Preview</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize preview" withHandle />
          <ResizablePanel defaultSize="40%">
            <Pane muted>Console</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="A panel that can be dragged to zero or past its limits, hiding content for good. minSize and maxSize have to stop the drag, not just the render."
        id="constrained"
        note="The first panel is held between 30% and 70%. Drag past either limit and the divider stops."
        title="Min and max size"
      >
        <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`}>
          <ResizablePanel defaultSize="50%" maxSize="70%" minSize="30%">
            <Pane muted>30% to 70%</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize constrained panel" withHandle />
          <ResizablePanel defaultSize="50%">
            <Pane>Flexible</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="A collapsible panel that cannot be restored from the keyboard, or that restores to zero instead of its previous size."
        code={`<ResizablePanel collapsible collapsedSize="0%" defaultSize="30%" minSize="20%">
  …
</ResizablePanel>`}
        id="collapsible"
        note="Drag the first panel below 20% and it collapses to nothing. With the divider focused, Enter toggles it between collapsed and its last size."
        title="Collapsible"
      >
        <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`}>
          <ResizablePanel collapsible defaultSize="30%" minSize="20%">
            <Pane muted>Outline</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize outline" withHandle />
          <ResizablePanel defaultSize="70%">
            <Pane>Document</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="A disabled divider that is still focusable or still shows a resize cursor, promising an interaction that does nothing."
        id="disabled"
        note="disabled on the handle takes it out of the tab order and shows a not-allowed cursor. The panels keep their sizes."
        title="Disabled handle"
      >
        <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`}>
          <ResizablePanel defaultSize="40%">
            <Pane muted>Pinned</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize pinned panel" disabled withHandle />
          <ResizablePanel defaultSize="60%">
            <Pane>Fixed layout</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="Three panes where the second resize pushes the first, or a divider that grabs the wrong neighbour."
        id="three-panes"
        note="Each divider resizes the two panels beside it. Press F6 on a divider to jump to the next one."
        title="Three panes"
      >
        <ResizablePanelGroup className={`h-32 w-full max-w-2xl ${FRAME}`}>
          <ResizablePanel defaultSize="20%" minSize="10%">
            <Pane muted>Nav</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize nav" withHandle />
          <ResizablePanel defaultSize="55%">
            <Pane>Content</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize content" withHandle />
          <ResizablePanel defaultSize="25%" minSize="10%">
            <Pane muted>Inspector</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="A nested group that steals the outer group's drag, or whose divider inherits the wrong orientation."
        id="nested"
        note="A vertical group sits inside the second panel of a horizontal one. Each divider keeps its own axis."
        title="Nested groups"
      >
        <ResizablePanelGroup className={`h-56 w-full max-w-2xl ${FRAME}`}>
          <ResizablePanel defaultSize="30%" minSize="15%">
            <Pane muted>Files</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize files" withHandle />
          <ResizablePanel defaultSize="70%">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="65%">
                <Pane>Editor</Pane>
              </ResizablePanel>
              <ResizableHandle aria-label="Resize editor" withHandle />
              <ResizablePanel defaultSize="35%">
                <Pane muted>Terminal</Pane>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="Long unbroken content that pushes a panel wider than its share, so the divider and the drag no longer agree. Panel content has to shrink or scroll itself."
        id="overflow"
        note="The long label is truncated inside a panel narrowed to its minimum. Overflow is the content's job; the panel does not clip or scroll for you."
        title="Overflow — long content"
      >
        <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`}>
          <ResizablePanel defaultSize="30%" minSize="15%">
            <div className="flex h-full items-center p-4">
              <span className="min-w-0 truncate">{LONG_LABEL}</span>
            </div>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize label panel" withHandle />
          <ResizablePanel defaultSize="70%">
            <div className="h-full overflow-auto p-4 text-muted-foreground">
              <p className="m-0 w-[40ch]">{LONG_LABEL}</p>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="A panel with nothing in it that collapses to an unlabelled blank. An empty pane should say what belongs there."
        id="empty"
        note="The right pane has no selection yet and says so, rather than rendering a blank rectangle."
        title="Empty pane"
      >
        <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`}>
          <ResizablePanel defaultSize="40%">
            <Pane muted>3 items</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize list" withHandle />
          <ResizablePanel defaultSize="60%">
            <Pane>
              <span className="text-muted-foreground">Select an item to see its details</span>
            </Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </State>

      <State
        breaks="Assuming the component persists sizes. It does not: the layout is only reported through onLayoutChanged, and restoring it is defaultLayout on the group, keyed by panel id."
        code={`<ResizablePanelGroup
  defaultLayout={saved}
  onLayoutChanged={(layout) => save(layout)}
>
  <ResizablePanel id="files" defaultSize="35%" minSize="20%">…</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel id="editor" defaultSize="65%">…</ResizablePanel>
</ResizablePanelGroup>`}
        id="layout"
        note="onLayoutChanged fires once a drag or key press has settled, with a map of panel id to percentage. Give panels ids if you intend to restore them."
        title="Reading the layout"
      >
        <SavedLayout />
      </State>

      <State
        breaks="Dragging the divider with a pointer inside dir=rtl: react-resizable-panels measures the drag from the left edge and has no dir option, so the divider can follow the pointer the wrong way. Use the keyboard in RTL layouts until the library supports it."
        id="rtl"
        note="Inside dir=rtl the panels flip and the arrow keys mirror with them: the first panel sits on the right, ArrowLeft grows it and ArrowRight shrinks it. Pointer dragging is the part that is not mirrored."
        title="Right-to-left"
      >
        <div dir="rtl">
          <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`}>
            <ResizablePanel defaultSize="40%" minSize="20%">
              <Pane muted>Start panel</Pane>
            </ResizablePanel>
            <ResizableHandle aria-label="Resize start panel" withHandle />
            <ResizablePanel defaultSize="60%">
              <Pane>End panel</Pane>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </State>

      <State
        breaks="A divider that cannot be operated from the keyboard, or whose keys do not match the group axis (Left/Right on a vertical group)."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "moves focus onto the divider; it is a separator with tabindex 0.",
            },
            {
              keys: "← / →",
              does: "on a horizontal group, resize the neighbouring panels by 5% per press.",
            },
            { keys: "↑ / ↓", does: "do the same on a vertical group." },
            { keys: "Home / End", does: "push the divider to its minimum or maximum position." },
            {
              keys: "Enter",
              does: "collapses or restores the collapsible panel before the divider.",
            },
            {
              keys: "F6",
              does: "moves focus to the next divider in the group (Shift+F6 goes back).",
            },
          ]}
        >
          <ResizablePanelGroup className={`h-32 w-full max-w-xl ${FRAME}`}>
            <ResizablePanel collapsible defaultSize="30%" minSize="20%">
              <Pane muted>Panel A</Pane>
            </ResizablePanel>
            <ResizableHandle aria-label="Resize panel A" withHandle />
            <ResizablePanel defaultSize="40%">
              <Pane>Panel B</Pane>
            </ResizablePanel>
            <ResizableHandle aria-label="Resize panel B" withHandle />
            <ResizablePanel defaultSize="30%" minSize="10%">
              <Pane muted>Panel C</Pane>
            </ResizablePanel>
          </ResizablePanelGroup>
        </KeyboardPath>
      </State>

      <Aside title="Sizes are not persisted by this component">
        <p>
          The wrapper passes everything through to <code>react-resizable-panels</code> v4. That
          version has no built-in storage: it offers <code>defaultLayout</code> on the group, the{" "}
          <code>onLayoutChanged</code> callback, and a <code>useDefaultLayout</code> hook that is
          not re-exported from <code>@nebutra/ui</code>. Numeric sizes mean pixels, so write{" "}
          <code>defaultSize="30%"</code>, not <code>defaultSize={"{30}"}</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
