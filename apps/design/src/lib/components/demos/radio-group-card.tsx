"use client";

import { Buildings, Lightning, User } from "@nebutra/icons";
import { Button, RadioGroupCard, RadioGroupCardItem } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  Row,
  Specimen,
  Stack,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";

const SURFACES = [
  { id: "background", label: "background", className: "bg-background" },
  { id: "card", label: "card", className: "bg-card" },
  { id: "muted", label: "muted", className: "bg-muted" },
  { id: "popover", label: "popover", className: "bg-popover" },
];

const PLANS = [
  { value: "starter", title: "Starter", note: "For personal projects", Icon: User },
  { value: "team", title: "Team", note: "For shared workspaces", Icon: Lightning },
  { value: "enterprise", title: "Enterprise", note: "For larger organizations", Icon: Buildings },
] as const;

function PlanCards({ itemClassName = "w-36" }: { itemClassName?: string }) {
  return (
    <>
      {PLANS.map((plan) => (
        <RadioGroupCardItem
          className={`${itemClassName} gap-1`}
          key={plan.value}
          value={plan.value}
        >
          <span className="text-center font-medium text-foreground text-sm">{plan.title}</span>
          <span className="text-center text-muted-foreground text-xs">{plan.note}</span>
        </RadioGroupCardItem>
      ))}
    </>
  );
}

function FormReadout() {
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(String(new FormData(event.currentTarget).get("plan") ?? ""));
      }}
    >
      <Stack>
        <RadioGroupCard aria-label="Plan" className="grid-cols-3" defaultValue="team" name="plan">
          <PlanCards />
        </RadioGroupCard>
        <Row>
          <Button type="submit">Read value</Button>
          <span className="font-mono text-muted-foreground text-xs">
            FormData.get("plan") = {submitted === null ? "not read yet" : JSON.stringify(submitted)}
          </span>
        </Row>
      </Stack>
    </form>
  );
}

export default function RadioGroupCardDemo(_: DemoProps) {
  const [value, setValue] = React.useState<unknown>("team");

  return (
    <DemoPage>
      <State
        breaks="A selected card with no visible state, or an unselected card that cannot be told apart from the page. Two cards below: one selected, one not."
        code={`<RadioGroupCard aria-label="Plan" className="grid-cols-3" defaultValue="team">
  <RadioGroupCardItem className="w-36 gap-1" value="starter">
    <span className="font-medium text-foreground text-sm">Starter</span>
  </RadioGroupCardItem>
  <RadioGroupCardItem className="w-36 gap-1" value="team">
    <span className="font-medium text-foreground text-sm">Team</span>
  </RadioGroupCardItem>
</RadioGroupCard>`}
        id="default"
        note="The selected card swaps its edge for the primary colour and adds a 1px ring and a faint primary wash. Cards have no check mark, so the border is the signal."
        title="Default"
      >
        <RadioGroupCard aria-label="Plan" className="grid-cols-3" defaultValue="team">
          <PlanCards />
        </RadioGroupCard>
      </State>

      <State
        breaks="An unselected card whose edge vanishes into its surface. WCAG 1.4.11 asks for 3:1 on a control's boundary, and the page background, card, muted and popover surfaces all differ. Switch the language and the theme above and check every tile."
        id="off-state"
        note="One selected and one unselected card on each surface token. The unselected edge is --control-border, derived from each language's own foreground and background, not the --input hairline."
        title="Unselected on every surface"
      >
        <Row align="start">
          {SURFACES.map((surface) => (
            <Specimen key={surface.id} label={surface.label}>
              <div className={`rounded-lg border border-border p-3 ${surface.className}`}>
                <RadioGroupCard aria-label={`Plan on ${surface.label}`} defaultValue="team">
                  <RadioGroupCardItem className="w-36 gap-1" value="starter">
                    <span className="font-medium text-foreground text-sm">Starter</span>
                  </RadioGroupCardItem>
                  <RadioGroupCardItem className="w-36 gap-1" value="team">
                    <span className="font-medium text-foreground text-sm">Team</span>
                  </RadioGroupCardItem>
                </RadioGroupCard>
              </div>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="A group that cannot start empty. Nothing is selected until the user chooses: no card shows the selected look and the group is still reachable by Tab."
        id="empty-selection"
        note="No defaultValue: every card shows the unselected edge. After a choice there is no way back to none."
        title="Nothing selected"
      >
        <RadioGroupCard aria-label="Plan, nothing selected" className="grid-cols-3">
          <PlanCards />
        </RadioGroupCard>
      </State>

      <State
        breaks="Layout owned by the wrong layer: the group is a one-column grid and the caller sets the columns. A card that stretches to the column width when it was given none."
        id="layouts"
        note="The group is grid gap-2 and nothing else. Columns come from className on the group; card width from className on the items."
        title="Layouts"
      >
        <Stack>
          <Specimen label="stacked (default)">
            <RadioGroupCard aria-label="Plan, stacked" className="w-64" defaultValue="starter">
              <PlanCards itemClassName="w-full" />
            </RadioGroupCard>
          </Specimen>
          <Specimen label="grid-cols-3">
            <RadioGroupCard aria-label="Plan, columns" className="grid-cols-3" defaultValue="team">
              <PlanCards />
            </RadioGroupCard>
          </Specimen>
        </Stack>
      </State>

      <State
        breaks="Cards that accept only text. The item is a button holding any content: an icon and a title stack in the middle of the card."
        id="rich-content"
        note="Items are flex-col and centred, so an icon above a title and a note works without extra wrappers."
        title="Rich content"
      >
        <RadioGroupCard aria-label="Plan, with icons" className="grid-cols-3" defaultValue="team">
          {PLANS.map(({ Icon, ...plan }) => (
            <RadioGroupCardItem className="w-36 gap-2" key={plan.value} value={plan.value}>
              <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
              <span className="text-center font-medium text-foreground text-sm">{plan.title}</span>
              <span className="text-center text-muted-foreground text-xs">{plan.note}</span>
            </RadioGroupCardItem>
          ))}
        </RadioGroupCard>
      </State>

      <State
        breaks="A controlled group that does not follow its value, or an onValueChange that receives an event instead of the value."
        code={`<RadioGroupCard aria-label="Plan" onValueChange={setValue} value={value}>…</RadioGroupCard>`}
        id="controlled"
        note="Controlled with value and onValueChange. The readout is the value Base UI hands back."
        title="Controlled"
      >
        <Stack>
          <RadioGroupCard
            aria-label="Plan, controlled"
            className="grid-cols-3"
            onValueChange={setValue}
            value={value}
          >
            <PlanCards />
          </RadioGroupCard>
          <Row>
            <Button onClick={() => setValue("starter")} variant="outline">
              Set Starter
            </Button>
            <span className="font-mono text-muted-foreground text-xs">
              value = {JSON.stringify(value)}
            </span>
          </Row>
        </Stack>
      </State>

      <State
        breaks="A disabled card that still looks pressable, or a disabled group whose selected card loses its selected look. Hover each: a disabled card must not react."
        id="disabled"
        note="One disabled card, a disabled group with a selection, and a disabled group with none. Disabled cards are 50% opacity and show a not-allowed cursor."
        title="Disabled"
      >
        <Stack>
          <Specimen label="item disabled">
            <RadioGroupCard
              aria-label="Plan, item disabled"
              className="grid-cols-3"
              defaultValue="starter"
            >
              <RadioGroupCardItem className="w-36 gap-1" value="starter">
                <span className="font-medium text-foreground text-sm">Starter</span>
              </RadioGroupCardItem>
              <RadioGroupCardItem className="w-36 gap-1" disabled value="team">
                <span className="font-medium text-foreground text-sm">Team</span>
              </RadioGroupCardItem>
              <RadioGroupCardItem className="w-36 gap-1" value="enterprise">
                <span className="font-medium text-foreground text-sm">Enterprise</span>
              </RadioGroupCardItem>
            </RadioGroupCard>
          </Specimen>
          <Specimen label="group disabled, Team selected">
            <RadioGroupCard
              aria-label="Plan, group disabled"
              className="grid-cols-3"
              defaultValue="team"
              disabled
            >
              <PlanCards />
            </RadioGroupCard>
          </Specimen>
          <Specimen label="group disabled, none selected">
            <RadioGroupCard
              aria-label="Plan, group disabled, empty"
              className="grid-cols-3"
              disabled
            >
              <PlanCards />
            </RadioGroupCard>
          </Specimen>
        </Stack>
      </State>

      <State
        breaks="A long title that is clipped or overflows the card, or a card that crushes its neighbours instead of growing."
        id="overflow"
        note="Cards do not truncate. The text wraps inside the card and centres, and the card grows taller with it. A row wider than its container scrolls."
        title="Overflow — long title"
      >
        <Stack>
          <div className="max-w-xs rounded-lg bg-background p-3">
            <RadioGroupCard aria-label="Plan, long title" defaultValue="long">
              <RadioGroupCardItem className="gap-1" value="short">
                <span className="font-medium text-foreground text-sm">Starter</span>
              </RadioGroupCardItem>
              <RadioGroupCardItem className="gap-1" value="long">
                <span className="text-center font-medium text-foreground text-sm">
                  {LONG_LABEL}
                </span>
                <span className="text-center text-muted-foreground text-xs">
                  Billed annually, minimum 25 seats
                </span>
              </RadioGroupCardItem>
            </RadioGroupCard>
          </div>
          <div className="max-w-xs overflow-x-auto rounded-lg bg-background p-3">
            <RadioGroupCard aria-label="Plan, row" className="grid-flow-col" defaultValue="team">
              <PlanCards itemClassName="w-40" />
            </RadioGroupCard>
          </div>
        </Stack>
      </State>

      <State
        breaks="A group with no cards, which renders an empty radiogroup."
        id="empty"
        note="No children renders an empty grid with no height. It is a call-site bug and this is what it looks like so it is recognisable."
        title="Empty"
      >
        <RadioGroupCard aria-label="Plan, empty">{null}</RadioGroupCard>
      </State>

      <State
        breaks="Layout that assumes left-to-right: the grid must mirror under dir=rtl."
        id="rtl"
        note="dir=rtl on the wrapper reverses the column order of the grid."
        title="Right-to-left layout"
      >
        <div dir="rtl">
          <RadioGroupCard aria-label="Plan, rtl" className="grid-cols-3" defaultValue="team">
            <PlanCards />
          </RadioGroupCard>
        </div>
      </State>

      <State
        breaks="A group that submits nothing because the radio has no name. The group's name prop is what a form reads."
        id="form"
        note="Pass name to the group and read the chosen value with FormData on submit."
        title="Reading the value"
      >
        <FormReadout />
      </State>

      <State
        breaks="A tab stop per card instead of one for the group, or arrow keys that move focus without choosing."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "enters the group on the selected card (or the first one when none is) and leaves it on the next Tab.",
            },
            {
              keys: "→ ↓ ← ↑",
              does: "moves focus to the neighbouring enabled card, wrapping at the ends, and selects it.",
            },
            { keys: "Space", does: "selects the focused card." },
            { keys: "Enter", does: "does nothing; the radio suppresses it." },
          ]}
        >
          <RadioGroupCard
            aria-label="Plan, keyboard"
            className="grid-cols-3"
            defaultValue="starter"
          >
            <PlanCards />
          </RadioGroupCard>
        </KeyboardPath>
      </State>

      <Aside title="What the card does not show">
        <p>
          There is no invalid styling. Base UI marks a radio inside a Field with{" "}
          <code>data-invalid</code>, but the card does not style it, so an error needs its own
          message beside the group. The selected card has no check mark either: the primary border,
          ring and wash are the only signal beyond <code>aria-checked</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
