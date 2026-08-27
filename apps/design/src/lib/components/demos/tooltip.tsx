"use client";

import { Information } from "@nebutra/icons";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@nebutra/ui/primitives";
import { Aside, DemoPage, KeyboardPath, LONG_PARAGRAPH, Row, Specimen, State } from "../demo-kit";

export default function TooltipDemo() {
  return (
    <DemoPage>
      <State
        breaks="A tooltip carrying information that exists nowhere else. Anything essential must be in the page; a tooltip is an aid, not a container."
        id="default"
        note="Hover or focus the trigger. asChild puts the trigger behaviour onto a real control."
        title="Default"
      >
        <Row>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Add this project to your library.</TooltipContent>
          </Tooltip>
        </Row>
      </State>

      <State
        breaks="An icon-only trigger with no accessible name, where the tooltip is the only label. If the tooltip is the label, the button has no name until it is hovered."
        id="icon-trigger"
        note="The icon button carries its own aria-label; the tooltip adds detail rather than replacing the name."
        title="Icon trigger"
      >
        <Row>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label="About build caching" shape="square" variant="ghost">
                <Information />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cached builds skip the install step.</TooltipContent>
          </Tooltip>
        </Row>
      </State>

      <State
        breaks="A tooltip that opens instantly on every pass of the pointer, or one so slow it feels broken. The provider sets the delay for its whole subtree; a per-tooltip value overrides it."
        id="delay"
        note="Three delays side by side. Sweep the pointer across all three and the difference is obvious."
        title="Open delay"
      >
        <Row className="gap-8">
          {[0, 300, 900].map((delay) => (
            <Specimen key={delay} label={`delayDuration={${delay}}`}>
              <TooltipProvider delayDuration={delay}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">{delay}ms</Button>
                  </TooltipTrigger>
                  <TooltipContent>Opened after {delay}ms.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="A tooltip on a disabled button. A disabled button is not focusable and does not fire pointer events in every browser, so the explanation for why it is disabled never appears. The fix is a wrapper that stays interactive."
        id="disabled-trigger"
        note="Left: tooltip directly on a disabled button. Right: the same disabled button inside an interactive wrapper."
        title="Disabled trigger — the case that fails"
      >
        <Row className="gap-8">
          <Specimen label="tooltip on the disabled button">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled variant="outline">
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>Only an owner can delete this project.</TooltipContent>
            </Tooltip>
          </Specimen>
          <Specimen label="tooltip on a wrapper">
            <Tooltip>
              <TooltipTrigger asChild>
                {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a focusable
                    wrapper is the only way to reach a tooltip whose trigger is a
                    disabled button — disabled controls are not focusable and do
                    not reliably fire pointer events. Demonstrating that is the
                    entire point of this state. */}
                <span tabIndex={0}>
                  <Button disabled variant="outline">
                    Delete
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Only an owner can delete this project.</TooltipContent>
            </Tooltip>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A long tooltip that runs off the viewport instead of flipping, or one that grows to a paragraph when it should have been page content."
        id="overflow"
        note="A deliberately overlong tooltip, and one against the right edge of its container."
        title="Overflow and edge placement"
      >
        <div className="flex justify-between rounded-lg bg-background p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Long body</Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{LONG_PARAGRAPH}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">At the edge</Button>
            </TooltipTrigger>
            <TooltipContent>This one has to flip to stay on screen.</TooltipContent>
          </Tooltip>
        </div>
      </State>

      <State
        breaks="A tooltip that only opens on hover. Keyboard focus must open it, and Escape must close it without moving focus."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "focuses the trigger and opens the tooltip — no pointer needed." },
            { keys: "Escape", does: "closes it while focus stays on the trigger." },
            { keys: "Tab", does: "moves on, and the tooltip closes behind you." },
          ]}
        >
          <Row>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">First</Button>
              </TooltipTrigger>
              <TooltipContent>Opens on focus.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Second</Button>
              </TooltipTrigger>
              <TooltipContent>So does this one.</TooltipContent>
            </Tooltip>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="There is no empty or loading state">
        <p>
          A tooltip with no content should not render at all — an empty bubble is worse than
          nothing. Async content in a tooltip is an anti-pattern for the same reason: it appears and
          disappears faster than a request resolves. If content must be fetched, use{" "}
          <code>Popover</code>, which stays open.
        </p>
      </Aside>
    </DemoPage>
  );
}
