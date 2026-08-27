"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import { Input, Kbd } from "@nebutra/ui/primitives";
import { Aside, DemoPage, Row, Specimen, State } from "../demo-kit";

export default function KbdDemo() {
  return (
    <DemoPage>
      <State
        breaks="Modifier glyphs typed by hand, which is how a shortcut hint ends up showing ⌘ to a Windows user. The modifier props resolve per platform."
        id="modifiers"
        note="meta, shift, alt and ctrl each render the right glyph for the reader's platform."
        title="Modifiers"
      >
        <Row className="gap-6">
          <Specimen label="meta">
            <Kbd meta>K</Kbd>
          </Specimen>
          <Specimen label="shift">
            <Kbd shift>P</Kbd>
          </Specimen>
          <Specimen label="alt">
            <Kbd alt>Enter</Kbd>
          </Specimen>
          <Specimen label="ctrl">
            <Kbd ctrl>C</Kbd>
          </Specimen>
          <Specimen label="meta + shift">
            <Kbd meta shift>
              P
            </Kbd>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A shortcut hint that is taller than the row it sits in, or one whose small variant loses legibility."
        id="sizes"
        note="small is the inline size, for use inside a control."
        title="Sizes"
      >
        <Row className="gap-6">
          <Specimen label="default">
            <Kbd meta>K</Kbd>
          </Specimen>
          <Specimen label="small">
            <Kbd meta small>
              K
            </Kbd>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A hint that changes the height of the control it sits inside. Compare the two field heights."
        id="in-context"
        note="Inside an Input's shortcut slot, and inline in a sentence."
        title="In context"
      >
        <div className="flex flex-col gap-4">
          <div className="max-w-sm">
            <Input placeholder="Search" prefix={<MagnifyingGlass />} shortcut="⌘K" type="search" />
          </div>
          <p className="max-w-prose text-foreground text-sm">
            Press{" "}
            <Kbd meta small>
              K
            </Kbd>{" "}
            to open the command palette, then <Kbd small>Enter</Kbd> to run the highlighted command.
          </p>
        </div>
      </State>

      <State
        breaks="A multi-key sequence rendered as one enormous key, or a long key name that stretches the pill out of proportion."
        id="overflow"
        note="A named key and a chord in a narrow container."
        title="Overflow — long key names"
      >
        <div className="max-w-[12rem] rounded-lg bg-background p-3">
          <Row>
            <Kbd>PageDown</Kbd>
            <Kbd meta shift alt>
              Backspace
            </Kbd>
          </Row>
        </div>
      </State>

      <State
        breaks="An empty Kbd rendering an orphan pill."
        id="empty"
        note="No children — a bare pill. This is a call-site bug and is shown so it is recognisable, not so it is used."
        title="Empty"
      >
        <Row>
          <Kbd>{null}</Kbd>
          <Kbd meta>{null}</Kbd>
        </Row>
      </State>

      <Aside title="Kbd does not bind anything">
        <p>
          This component renders a key. It does not register a shortcut, and there is no keyboard
          path to try here — the binding lives with whatever owns the handler. A <code>Kbd</code>{" "}
          showing a shortcut that no longer works is the failure mode, and it is not one this
          component can detect.
        </p>
      </Aside>
    </DemoPage>
  );
}
