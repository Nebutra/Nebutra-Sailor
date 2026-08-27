"use client";

import { ErrorState } from "@nebutra/ui/layout";
import * as React from "react";
import {
  Aside,
  ControlButton,
  Controls,
  DemoPage,
  KeyboardPath,
  LONG_PARAGRAPH,
  Stack,
  State,
} from "../demo-kit";

export default function ErrorStateDemo() {
  const [retries, setRetries] = React.useState(0);

  return (
    <DemoPage>
      <State
        breaks="An error with no retry and no identifier, which leaves the reader with nothing to do and support with nothing to search."
        id="default"
        note="Title, message, retry and a stable identifier — the four parts of a usable failure."
        title="Default"
      >
        <div className="rounded-lg bg-background p-2">
          <ErrorState
            errorId="dpl_7Hq2xR"
            message="The deployments API did not respond within 10 seconds."
            onRetry={() => setRetries((v) => v + 1)}
            title="Couldn’t load deployments"
          />
        </div>
        <p className="mt-3 text-muted-foreground text-xs">Retry pressed {retries} times.</p>
      </State>

      <State
        breaks="A retry button that appears when there is nothing to retry. The action only renders when onRetry is supplied — compare the two."
        id="retry"
        note="With and without onRetry."
        title="Retryable versus terminal"
      >
        <Stack>
          <div className="rounded-lg bg-background p-2">
            <ErrorState
              message="The deployments API did not respond."
              onRetry={() => setRetries((v) => v + 1)}
              title="Couldn’t load deployments"
            />
          </div>
          <div className="rounded-lg bg-background p-2">
            <ErrorState
              message="This project was deleted and cannot be restored."
              title="Project not found"
            />
          </div>
        </Stack>
      </State>

      <State
        breaks="A default title that reads as a system talking to itself. The component's fallback title is generic on purpose; a caller that leaves it is choosing the worse copy, and this is what that choice looks like."
        id="defaults"
        note="No title supplied, so the built-in default is used. Compare it against the first state."
        title="Title omitted"
      >
        <div className="rounded-lg bg-background p-2">
          <ErrorState message="Request failed with status 503." />
        </div>
      </State>

      <State
        breaks="A message-free error, which is the least useful state this component can be in. It renders, and it says nothing."
        id="empty"
        note="No message and no id."
        title="Nothing but a title"
      >
        <div className="rounded-lg bg-background p-2">
          <ErrorState title="Couldn’t load deployments" />
        </div>
      </State>

      <State
        breaks="A raw exception message pasted straight through, which is both unreadable and a leak risk. Long content must wrap inside the panel and the identifier must stay selectable."
        id="overflow"
        note="A long message and a long identifier at a constrained width."
        title="Overflow — long message"
      >
        <div className="max-w-[18rem] rounded-lg bg-background p-2">
          <ErrorState
            errorId="dpl_7Hq2xR9kLm3Np8Qv1Ws4Yz6Bc0De2Fg"
            message={LONG_PARAGRAPH}
            onRetry={() => setRetries((v) => v + 1)}
            title="Couldn’t load the deployment history for this project"
          />
        </div>
      </State>

      <State
        breaks="A retry that is not a real button, so it cannot be reached by keyboard — the failure state being unreachable is the worst version of this defect."
        id="keyboard"
        title="Keyboard path"
      >
        <Controls>
          <ControlButton onClick={() => setRetries(0)}>Reset counter</ControlButton>
        </Controls>
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "reaches the retry action — it is the only focusable thing here.",
            },
            { keys: "Enter / Space", does: "fires onRetry." },
          ]}
        >
          <div className="rounded-lg bg-background p-2">
            <ErrorState
              errorId="dpl_7Hq2xR"
              message="The deployments API did not respond."
              onRetry={() => setRetries((v) => v + 1)}
              title="Couldn’t load deployments"
            />
          </div>
        </KeyboardPath>
      </State>

      <Aside title="ErrorState, Alert or the error boundary">
        <p>
          <code>ErrorState</code> replaces a panel's content when the content could not be fetched.{" "}
          <code>Alert</code> sits above content that is still there. A route-level failure belongs
          in an error boundary with <code>FullPageStatus</code>, which is not covered on this site
          yet. Reaching for the wrong one of the three is how a page ends up showing both its data
          and an error about that data.
        </p>
      </Aside>
    </DemoPage>
  );
}
