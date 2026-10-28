"use client";

import { AlignmentCenter, AlignmentLeft, AlignmentRight } from "@nebutra/icons";
import { ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  AxisMatrix,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  Row,
  Specimen,
  Stack,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";
import { axis, axisDefault } from "../derived";

// Fallbacks until the registry declares a cva request for toggleGroupItemVariants.
const FALLBACK_VARIANTS = ["default", "outline", "pill"];
const FALLBACK_SIZES = ["default", "sm", "lg"];

function Ranges({ disabledMonth = false }: { disabledMonth?: boolean }) {
  return (
    <>
      <ToggleGroupItem value="day">Day</ToggleGroupItem>
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem disabled={disabledMonth} value="month">
        Month
      </ToggleGroupItem>
    </>
  );
}

export default function ToggleGroupDemo({ derived }: DemoProps) {
  const variants = axis(derived, "item", "variant");
  const sizes = axis(derived, "item", "size");
  const variantList = variants.length ? variants : FALLBACK_VARIANTS;
  const sizeList = sizes.length ? sizes : FALLBACK_SIZES;
  const [channels, setChannels] = React.useState<string | string[]>(["email"]);
  const [range, setRange] = React.useState<string | string[]>("week");

  return (
    <DemoPage>
      <State
        breaks="A single-select group that lets the last item be deselected, leaving the radiogroup in a state it says is impossible. Click the selected item: nothing happens."
        code={`<ToggleGroup aria-label="Range" defaultValue="week" type="single">
  <ToggleGroupItem value="day">Day</ToggleGroupItem>
  <ToggleGroupItem value="week">Week</ToggleGroupItem>
  <ToggleGroupItem value="month">Month</ToggleGroupItem>
</ToggleGroup>`}
        id="default"
        note="Single selection, the default type. Clicking the selected item again does not clear it."
        title="Default"
      >
        <ToggleGroup aria-label="Range" defaultValue="week">
          <Ranges />
        </ToggleGroup>
      </State>

      <State
        breaks="A variant added to toggleGroupItemVariants whose selected item is not distinguishable from its neighbours. Compare the selected and unselected item in every row, in light and dark."
        id="variants"
        note={`All ${variantList.length} variants, each with Week selected. Pill marks the selected item with a tint and a primary label only, with no shadow.`}
        title="Every variant"
      >
        <AxisMatrix
          axisName="variant"
          defaultValue={axisDefault(derived, "item", "variant") ?? "default"}
          render={(variant) => (
            <ToggleGroup
              aria-label={`${variant} range`}
              defaultValue="week"
              variant={variant as never}
            >
              <Ranges />
            </ToggleGroup>
          )}
          values={variantList}
        />
      </State>

      <State
        breaks="A size whose height drifts from the matching Button or Input, so a group beside a field does not line up."
        id="sizes"
        note="Item heights are h-8, h-9 and h-10. The group adds its own 4px of track padding around them."
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          defaultValue={axisDefault(derived, "item", "size") ?? "default"}
          render={(size) => (
            <ToggleGroup aria-label={`${size} range`} defaultValue="week" size={size as never}>
              <Ranges />
            </ToggleGroup>
          )}
          values={sizeList}
        />
      </State>

      <State
        breaks="Multiple mode that behaves like single: a second click replacing the first selection instead of adding to it, or the value arriving as a string."
        code={`<ToggleGroup
  aria-label="Channels"
  onValueChange={setChannels}
  type="multiple"
  value={channels}
>
  <ToggleGroupItem value="email">Email</ToggleGroupItem>
  <ToggleGroupItem value="sms">SMS</ToggleGroupItem>
  <ToggleGroupItem value="push">Push</ToggleGroupItem>
</ToggleGroup>`}
        id="multiple"
        note="Controlled. Each item is an independent aria-pressed button and onValueChange receives an array; every selection can be cleared."
        title="Multiple selection"
      >
        <Stack>
          <ToggleGroup
            aria-label="Channels"
            onValueChange={setChannels}
            type="multiple"
            value={channels}
            variant="outline"
          >
            <ToggleGroupItem value="email">Email</ToggleGroupItem>
            <ToggleGroupItem value="sms">SMS</ToggleGroupItem>
            <ToggleGroupItem value="push">Push</ToggleGroupItem>
          </ToggleGroup>
          <p className="m-0 font-mono text-muted-foreground text-xs">
            value = {JSON.stringify(channels)}
          </p>
        </Stack>
      </State>

      <State
        breaks="A controlled single group that never updates because onValueChange was not wired, or one that reports an empty string when the selected item is clicked."
        id="controlled"
        note="Controlled single selection. The readout is the group's own value and only changes to a different item."
        title="Controlled single"
      >
        <Stack>
          <ToggleGroup aria-label="Range" onValueChange={setRange} value={range} variant="pill">
            <Ranges />
          </ToggleGroup>
          <p className="m-0 font-mono text-muted-foreground text-xs">
            value = {JSON.stringify(range)}
          </p>
        </Stack>
      </State>

      <State
        breaks="An icon-only item with no accessible name, which a screen reader announces as an unnamed radio."
        id="icon-only"
        note="Icon items carry an aria-label; the glyph is decoration."
        title="Icon only"
      >
        <ToggleGroup aria-label="Text alignment" defaultValue="left" variant="outline">
          <ToggleGroupItem aria-label="Align left" value="left">
            <AlignmentLeft />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Align center" value="center">
            <AlignmentCenter />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Align right" value="right">
            <AlignmentRight />
          </ToggleGroupItem>
        </ToggleGroup>
      </State>

      <State
        breaks="A disabled item that still looks pressable, a group-level disabled that skips an item, or a disabled selected item that loses its selected look."
        id="disabled"
        note="Item disabled, group disabled with a selection, and group disabled with none. Disabled items are 50% opacity and ignore the pointer."
        title="Disabled"
      >
        <Row align="start">
          <Specimen label="item disabled">
            <ToggleGroup aria-label="Item disabled" defaultValue="day">
              <Ranges disabledMonth />
            </ToggleGroup>
          </Specimen>
          <Specimen label="group disabled, Week selected">
            <ToggleGroup aria-label="Group disabled" defaultValue="week" disabled>
              <Ranges />
            </ToggleGroup>
          </Specimen>
          <Specimen label="group disabled, none selected">
            <ToggleGroup aria-label="Group disabled, empty" disabled>
              <Ranges />
            </ToggleGroup>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="Nothing selected in a single group. Every item must stay reachable by Tab until a choice is made, or the group is unreachable by keyboard."
        id="empty"
        note="No defaultValue: nothing is selected and all three items are tab stops. After a choice, only the selected item is."
        title="Nothing selected"
      >
        <ToggleGroup aria-label="Range, nothing selected">
          <Ranges />
        </ToggleGroup>
      </State>

      <State
        breaks="A long label that wraps inside an item (items are nowrap by design), or that crushes its neighbours instead of pushing the track wider."
        id="overflow"
        note="Items do not truncate or wrap. In a narrow container the track overflows, so the enclosing layout has to scroll or give."
        title="Overflow — long label, many items"
      >
        <Stack>
          <div className="max-w-xs overflow-x-auto rounded-lg bg-background p-3">
            <ToggleGroup aria-label="Region" defaultValue="long" variant="outline">
              <ToggleGroupItem value="short">Short</ToggleGroupItem>
              <ToggleGroupItem value="long">{LONG_LABEL}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="max-w-xs overflow-x-auto rounded-lg bg-background p-3">
            <ToggleGroup aria-label="Weekday" defaultValue="wed" variant="pill">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <ToggleGroupItem key={day} value={day.toLowerCase()}>
                  {day}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </Stack>
      </State>

      <State
        breaks="Layout or keys that assume left-to-right: the track and item order must mirror under dir=rtl, and so must the arrow keys (see the note below)."
        id="rtl"
        note="dir=rtl on the wrapper reverses the visual order of the items, and the Left and Right arrows follow it: Left moves to the next item, Right to the previous one."
        title="Right-to-left layout"
      >
        <div dir="rtl">
          <ToggleGroup aria-label="Range" defaultValue="week" variant="outline">
            <Ranges />
          </ToggleGroup>
        </div>
      </State>

      <State
        breaks="A roving tab stop that traps focus, an arrow key that moves focus without selecting, or a multiple group that adopts radio keys."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "enters a single group on the selected item only; a multiple group has a tab stop per item.",
            },
            {
              keys: "→ ↓",
              does: "in a single group, moves to the next enabled item, wrapping, and selects it.",
            },
            { keys: "← ↑", does: "the same, backwards." },
            { keys: "Home End", does: "jump to the first or last enabled item and select it." },
            {
              keys: "Space Enter",
              does: "press the focused item; in a multiple group, toggles it.",
            },
          ]}
        >
          <Stack>
            <ToggleGroup aria-label="Range, single" defaultValue="week">
              <Ranges />
            </ToggleGroup>
            <ToggleGroup aria-label="Channels, multiple" type="multiple" variant="outline">
              <ToggleGroupItem value="email">Email</ToggleGroupItem>
              <ToggleGroupItem value="sms">SMS</ToggleGroupItem>
              <ToggleGroupItem value="push">Push</ToggleGroupItem>
            </ToggleGroup>
          </Stack>
        </KeyboardPath>
      </State>

      <Aside title="Arrow keys follow dir=rtl">
        <p>
          In a left-to-right layout ArrowRight and ArrowDown move to the next item in DOM order and
          ArrowLeft and ArrowUp to the previous one. The handler reads the direction in effect at
          the item (the nearest <code>dir</code> attribute, else the computed direction), so inside{" "}
          <code>dir=rtl</code> ArrowLeft moves to the next item and ArrowRight to the previous one,
          matching where those items sit on screen. Up and Down always mean next and previous; Home
          and End are unaffected.
        </p>
      </Aside>
    </DemoPage>
  );
}
