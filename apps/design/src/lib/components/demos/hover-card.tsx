"use client";

import {
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Spinner,
} from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  ControlButton,
  Controls,
  DemoPage,
  KeyboardPath,
  LONG_PARAGRAPH,
  Row,
  State,
} from "../demo-kit";

export default function HoverCardDemo() {
  const [phase, setPhase] = React.useState<"ready" | "loading" | "empty" | "error">("ready");

  return (
    <DemoPage>
      <State
        breaks="A hover card that carries information found nowhere else. It opens on pointer hover only, so anything essential has to be on the page itself; the card is a preview."
        code={`<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="outline">@acme-web</Button>
  </HoverCardTrigger>
  <HoverCardContent>
    <p className="m-0 font-medium">acme-web</p>
    <p className="m-0 text-muted-foreground">Marketing site. Deployed 2 hours ago.</p>
  </HoverCardContent>
</HoverCard>`}
        id="default"
        note="Hover the trigger. The card opens after a short delay and closes shortly after the pointer leaves."
        title="Default"
      >
        <Row>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline">@acme-web</Button>
            </HoverCardTrigger>
            <HoverCardContent className="grid gap-1">
              <p className="m-0 font-medium">acme-web</p>
              <p className="m-0 text-muted-foreground">Marketing site. Deployed 2 hours ago.</p>
            </HoverCardContent>
          </HoverCard>
        </Row>
      </State>

      <State
        breaks="A card that opens off the edge of a narrow viewport instead of flipping, or an alignment that changes its width."
        id="placement"
        note="Four sides and three alignments against the same trigger style. The cards flip when there is no room."
        title="Side and alignment"
      >
        <div className="flex flex-col gap-4">
          <Row>
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <HoverCard key={side}>
                <HoverCardTrigger asChild>
                  <Button size="sm" variant="outline">
                    side={side}
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent side={side}>
                  <p className="m-0 text-foreground">Placed {side}.</p>
                </HoverCardContent>
              </HoverCard>
            ))}
          </Row>
          <div className="flex justify-between rounded-lg bg-background p-3">
            {(["start", "center", "end"] as const).map((align) => (
              <HoverCard key={align}>
                <HoverCardTrigger asChild>
                  <Button size="sm" variant="outline">
                    align={align}
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent align={align}>
                  <p className="m-0 text-foreground">Aligned {align}.</p>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>
      </State>

      <State
        breaks="A card that opens on every pass of the pointer, or one so slow it feels broken. openDelay and closeDelay are in milliseconds and default to 200 and 100."
        code={`<HoverCard closeDelay={0} openDelay={0}>…</HoverCard>
<HoverCard openDelay={600}>…</HoverCard>`}
        id="delay"
        note="Three delays side by side. Sweep the pointer across all three and the difference is obvious."
        title="Open and close delay"
      >
        <Row className="gap-8">
          {[
            { label: "openDelay={0}", openDelay: 0, closeDelay: 0 },
            { label: "default", openDelay: 200, closeDelay: 100 },
            { label: "openDelay={600}", openDelay: 600, closeDelay: 400 },
          ].map((item) => (
            <HoverCard closeDelay={item.closeDelay} key={item.label} openDelay={item.openDelay}>
              <HoverCardTrigger asChild>
                <Button size="sm" variant="outline">
                  {item.label}
                </Button>
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="m-0 text-foreground">Opened after {item.openDelay}ms.</p>
              </HoverCardContent>
            </HoverCard>
          ))}
        </Row>
      </State>

      <State
        breaks="A card whose size changes as its content arrives, or one that shows a blank box on an empty result. Switch the phase, then hover the trigger."
        id="phases"
        note="Loading, empty, error and ready in the same fixed-height card so the size does not change under the pointer."
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
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline">Last deployment</Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="flex min-h-20 flex-col justify-center text-sm">
                {phase === "loading" ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner label="Loading deployment" size="sm" />
                    Loading deployment…
                  </div>
                ) : null}
                {phase === "empty" ? (
                  <p className="m-0 text-muted-foreground">Not deployed yet.</p>
                ) : null}
                {phase === "error" ? (
                  <p className="m-0 text-destructive-strong">Could not load the deployment.</p>
                ) : null}
                {phase === "ready" ? (
                  <p className="m-0 text-foreground">a1b2c3d — Ready, 2 hours ago.</p>
                ) : null}
              </div>
            </HoverCardContent>
          </HoverCard>
        </Row>
      </State>

      <State
        breaks="Long text that overflows the card horizontally, or a tall card that runs off the viewport instead of scrolling inside itself."
        id="overflow"
        note="A long paragraph in a card capped to the viewport width, and a card with its own max height and scroll."
        title="Overflow — long content"
      >
        <Row>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline">Long text</Button>
            </HoverCardTrigger>
            <HoverCardContent className="max-w-[calc(100vw-2rem)] break-words">
              <p className="m-0 text-muted-foreground">{LONG_PARAGRAPH}</p>
            </HoverCardContent>
          </HoverCard>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline">Tall list</Button>
            </HoverCardTrigger>
            <HoverCardContent className="max-h-48 overflow-y-auto">
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {Array.from({ length: 16 }, (_, i) => (
                  <li className="text-foreground" key={i}>
                    Region {String(i + 1).padStart(2, "0")}
                  </li>
                ))}
              </ul>
            </HoverCardContent>
          </HoverCard>
        </Row>
      </State>

      <State
        breaks="A hover card relied on as the only route to its content. It opens on pointer hover only: focusing the trigger with the keyboard does not open it, and a click does not either. Put the same information on the page the trigger links to."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "focuses the trigger, as for any button." },
            {
              keys: "Enter / Space",
              does: "does not open the card; the open state is driven by pointer hover only.",
            },
            { keys: "Escape", does: "closes an open card." },
            { keys: "pointer leave", does: "closes it after closeDelay." },
          ]}
        >
          <Row>
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="secondary">Tab to me, then hover</Button>
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="m-0 text-foreground">Only a hover opens this.</p>
              </HoverCardContent>
            </HoverCard>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="HoverCard, Tooltip or Popover">
        <p>
          Use <code>Tooltip</code> for a one-line hint on a control, <code>Popover</code> for a
          panel the user opens on purpose with a click or the keyboard, and HoverCard only for a
          richer preview that supplements a link. HoverCard has no disabled state of its own: the
          hover handlers sit on the wrapper, not the trigger, so they do not read the trigger's
          disabled state, and touch devices have no hover to open it.
        </p>
      </Aside>
    </DemoPage>
  );
}
