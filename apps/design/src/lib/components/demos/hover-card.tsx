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
        breaks="A hover card that carries information found nowhere else. It opens from hover, keyboard focus and a click, but it is still a preview: anything essential has to be on the page itself."
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
        note="Hover the trigger, or Tab onto it. The card opens after a short delay and closes shortly after the pointer or focus leaves. A click or tap toggles it at once."
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
        note="Four sides and three alignments against the same trigger style. inline-start and inline-end are the logical sides: they swap left and right under dir=rtl. The cards flip when there is no room."
        title="Side and alignment"
      >
        <div className="flex flex-col gap-4">
          <Row>
            {(["top", "inline-end", "bottom", "inline-start"] as const).map((side) => (
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
        breaks="A hover card relied on as the only route to its content, or one that traps focus. Keyboard focus, Enter / Space and a tap all open it now, but the card is a preview that supplements a link: put the same information on the page the trigger links to."
        id="keyboard"
        note="Tab onto the trigger: the card opens after the open delay and focus stays on the trigger. Tab again to move into the card's links, and once more to leave it, which closes the card."
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "focuses the trigger and opens the card after openDelay. Focus stays on the trigger.",
            },
            {
              keys: "Enter / Space",
              does: "toggles the card at once, without waiting for openDelay.",
            },
            {
              keys: "Tab (again)",
              does: "moves into the card's focusable content, then on to the next control; the card closes. It is not a focus trap.",
            },
            { keys: "Escape", does: "closes an open card and leaves focus on the trigger." },
            { keys: "pointer leave / blur", does: "closes it after closeDelay." },
            { keys: "tap (touch)", does: "toggles the card; touch has no hover." },
          ]}
        >
          <Row>
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="secondary">Tab to me</Button>
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="m-0 text-foreground">Opened by hover, focus or a click.</p>
                <a className="text-sm underline" href="#keyboard">
                  A link you can Tab to
                </a>
              </HoverCardContent>
            </HoverCard>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="HoverCard, Tooltip or Popover">
        <p>
          Use <code>Tooltip</code> for a one-line hint on a control, <code>Popover</code> for a
          panel the user opens on purpose with a click or the keyboard, and HoverCard only for a
          richer preview that supplements a link. HoverCard opens from hover, keyboard focus and a
          click or tap, so a keyboard or touch user can reach it, but it is not announced like a
          dialog: keep the same information on the page. It has no disabled state of its own: the
          handlers sit on the wrapper, not the trigger, so they do not read the trigger's disabled
          state.
        </p>
      </Aside>
    </DemoPage>
  );
}
