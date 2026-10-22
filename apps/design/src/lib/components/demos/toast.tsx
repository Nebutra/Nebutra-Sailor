"use client";

import { Button, toast, useToasts } from "@nebutra/ui/primitives";
import * as React from "react";
import { DemoPage, Row, State } from "../demo-kit";
import type { DemoProps } from "../derived";

export default function ToastDemo({ derived }: DemoProps) {
  const toasts = useToasts();
  const tones = derived.axes.tone ?? [];
  const [count, setCount] = React.useState(0);

  return (
    <DemoPage>
      {/* No Toaster here: the page mounts exactly one, in the playground above
          (docs/toast.tsx). A second would render every toast twice. */}
      <State
        breaks="A tone added to ToastTone that has no trigger on useToasts, or a tone whose rich colour fails contrast in dark."
        code={`const toasts = useToasts();

toasts.success("Deployment promoted");
toasts.warning("Build is close to its time limit");
toasts.error("Deployment failed");
toasts.message({ text: "Draft saved" });`}
        id="tones"
        note={`${tones.length} tones. Press one and watch the bottom right of the window.`}
        title="Tones"
      >
        <Row>
          <Button onClick={() => toasts.message({ text: "Draft saved" })} variant="outline">
            message
          </Button>
          <Button onClick={() => toasts.success("Deployment promoted")} variant="outline">
            success
          </Button>
          <Button
            onClick={() => toasts.warning("Build is close to its time limit")}
            variant="outline"
          >
            warning
          </Button>
          <Button onClick={() => toasts.error("Deployment failed")} variant="outline">
            error
          </Button>
        </Row>
      </State>

      <State
        breaks="A toast with a description that is announced as one run-on string, or whose second line is not muted."
        code={`toasts.success("Domain verified", {
  description: "acme.com now points at this project.",
});`}
        id="description"
        title="With a description"
      >
        <Button
          onClick={() =>
            toasts.success("Domain verified", {
              description: "acme.com now points at this project.",
            })
          }
          variant="outline"
        >
          Show toast
        </Button>
      </State>

      <State
        breaks="An Undo that dismisses the toast but never calls back, or one that times out before anyone can reach it."
        code={`toasts.message({
  text: "Project archived",
  onUndoAction: () => restoreProject(),
});`}
        id="undo"
        note="Undo toasts stay longer than plain ones, so there is time to reach the button."
        title="With Undo"
      >
        <Row>
          <Button
            onClick={() =>
              toasts.message({
                text: "Project archived",
                onUndoAction: () => setCount((n) => n + 1),
              })
            }
            variant="outline"
          >
            Archive project
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            Undone {count} {count === 1 ? "time" : "times"}
          </span>
        </Row>
      </State>

      <State
        breaks="A persistent toast that cannot be dismissed, or that survives the route change that made it irrelevant."
        code={`const id = toasts.error("Upload failed", { preserve: true });

// later
toasts.dismiss(id);`}
        id="persistent"
        note="preserve keeps the toast until it is closed. Use it for errors the person has to act on."
        title="Persistent"
      >
        <Row>
          <Button
            onClick={() => toasts.error("Upload failed", { preserve: true })}
            variant="outline"
          >
            Show persistent
          </Button>
          <Button onClick={() => toasts.dismiss()} variant="ghost">
            Dismiss all
          </Button>
        </Row>
      </State>

      <State
        breaks="Importing toast from sonner directly, which skips the design-system classes and durations."
        code={`import { toast } from "@nebutra/ui/primitives";

toast("Link copied");`}
        id="imperative"
        note="Outside React, such as in a fetch wrapper, call the exported toast function. Inside components prefer useToasts."
        title="Outside a component"
      >
        <Button onClick={() => toast("Link copied")} variant="outline">
          Copy link
        </Button>
      </State>
    </DemoPage>
  );
}
