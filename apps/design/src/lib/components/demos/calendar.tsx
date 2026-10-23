"use client";

import { Calendar } from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, Row, Specimen, Stack, State } from "../demo-kit";

/** Month the examples open on, so a selection stays in view whatever today is. */
const MONTH = new Date(2026, 9, 1);
const day = (date: number) => new Date(2026, 9, date);

interface DayRange {
  from: Date | undefined;
  to?: Date | undefined;
}

function Surface({ children }: { children: React.ReactNode }) {
  return <div className="w-fit rounded-lg border border-border bg-background">{children}</div>;
}

function SingleDemo() {
  const [selected, setSelected] = React.useState<Date | undefined>(day(14));
  return (
    <Stack>
      <Surface>
        <Calendar defaultMonth={MONTH} mode="single" onSelect={setSelected} selected={selected} />
      </Surface>
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {selected ? `Selected ${selected.toDateString()}` : "Nothing selected"}
      </p>
    </Stack>
  );
}

function MultipleDemo() {
  const [selected, setSelected] = React.useState<Date[] | undefined>([day(6), day(13), day(20)]);
  return (
    <Surface>
      <Calendar defaultMonth={MONTH} mode="multiple" onSelect={setSelected} selected={selected} />
    </Surface>
  );
}

function RangeDemo({ initial, label }: { initial: DayRange | undefined; label: string }) {
  const [selected, setSelected] = React.useState<DayRange | undefined>(initial);
  return (
    <Specimen label={label}>
      <Surface>
        <Calendar defaultMonth={MONTH} mode="range" onSelect={setSelected} selected={selected} />
      </Surface>
    </Specimen>
  );
}

export default function CalendarDemo() {
  return (
    <DemoPage>
      <State
        breaks="A grid that does not follow the selection: the picked day has to carry the primary fill, and today has to stay readable without being picked."
        code={`<Calendar mode="single" selected={selected} onSelect={setSelected} />`}
        id="default"
        note="Single selection, opened on October 2026. Click a day to move the selection; click it again to clear it."
        title="Single"
      >
        <SingleDemo />
      </State>

      <State
        breaks="A multi-select where the fill collides with hover, so a selected day reads as hovered, or a removal that needs a second click."
        code={`<Calendar mode="multiple" selected={dates} onSelect={setDates} />`}
        id="multiple"
        note="Three days selected. Click a selected day to remove it."
        title="Multiple"
      >
        <MultipleDemo />
      </State>

      <State
        breaks="A range band that breaks into beads, or endpoints whose fill and band disagree. Endpoints are pills; the days between them are a flat band. Check a range that crosses a week, and one that is a single day."
        code={`<Calendar mode="range" selected={range} onSelect={setRange} />`}
        id="range"
        note="Within a week, across weeks, a start with no end yet, and a one-day range."
        title="Range"
      >
        <Row align="start">
          <RangeDemo initial={{ from: day(12), to: day(16) }} label="within a week" />
          <RangeDemo initial={{ from: day(7), to: day(22) }} label="across weeks" />
          <RangeDemo initial={{ from: day(15) }} label="start only" />
          <RangeDemo initial={{ from: day(15), to: day(15) }} label="one day" />
        </Row>
      </State>

      <State
        breaks="A disabled day that still takes a click, or one that is not dimmed. Disabled days are matched by date, weekday, or a before and after bound."
        code={`<Calendar
  mode="single"
  disabled={[{ before: new Date(2026, 9, 5) }, { dayOfWeek: [0, 6] }]}
/>`}
        id="disabled"
        note="Left: weekends disabled. Right: nothing before the 5th and nothing after the 25th, plus the 14th by date."
        title="Disabled days"
      >
        <Row align="start">
          <Surface>
            <Calendar defaultMonth={MONTH} disabled={{ dayOfWeek: [0, 6] }} mode="single" />
          </Surface>
          <Surface>
            <Calendar
              defaultMonth={MONTH}
              disabled={[{ before: day(5) }, { after: day(25) }, day(14)]}
              mode="single"
            />
          </Surface>
        </Row>
      </State>

      <State
        breaks="A month button that keeps working past the edge of the range. At the first or last allowed month the nav button dims and stops responding."
        code={`<Calendar mode="single" startMonth={new Date(2026, 9)} endMonth={new Date(2026, 10)} />`}
        id="bounds"
        note="Limited to October and November 2026. Previous is dimmed on October; Next dims on November."
        title="Month bounds"
      >
        <Surface>
          <Calendar
            defaultMonth={MONTH}
            endMonth={new Date(2026, 10)}
            mode="single"
            startMonth={MONTH}
          />
        </Surface>
      </State>

      <State
        breaks="An outside day that reads as selectable, or one that disappears and leaves ragged rows. Outside days are muted; with showOutsideDays off they are blank cells."
        id="outside"
        note="Left: outside days shown (the default), muted. Right: hidden, with fixedWeeks keeping six rows."
        title="Outside days and fixed weeks"
      >
        <Row align="start">
          <Surface>
            <Calendar defaultMonth={MONTH} mode="single" />
          </Surface>
          <Surface>
            <Calendar defaultMonth={MONTH} fixedWeeks mode="single" showOutsideDays={false} />
          </Surface>
        </Row>
      </State>

      <State
        breaks="A week-number column that shifts the grid out of line with the weekday header, or a week start that does not move the header and the days together."
        id="weeks"
        note="Week numbers on the left; a Monday week start on the right."
        title="Week numbers and week start"
      >
        <Row align="start">
          <Surface>
            <Calendar defaultMonth={MONTH} mode="single" showWeekNumber />
          </Surface>
          <Surface>
            <Calendar defaultMonth={MONTH} mode="single" weekStartsOn={1} />
          </Surface>
        </Row>
      </State>

      <State
        breaks="Two months that stack and overlap the navigation buttons, or a gap that stops following the month gap token."
        id="months"
        note="Two months side by side. They stack below the sm breakpoint."
        title="Multiple months"
      >
        <Surface>
          <Calendar defaultMonth={MONTH} mode="range" numberOfMonths={2} />
        </Surface>
      </State>

      <State
        breaks="A footer that is not part of the grid, or one that is cut off. The footer slot sits under the weeks and centres its text."
        code={`<Calendar mode="single" footer="Times are shown in UTC." />`}
        id="footer"
        note="The footer slot takes any node."
        title="Footer"
      >
        <Surface>
          <Calendar defaultMonth={MONTH} footer="Times are shown in UTC." mode="single" />
        </Surface>
      </State>

      <State
        breaks="A fixed-width grid in a narrow container. Seven cells do not shrink, so the container has to scroll or the grid spills."
        id="overflow"
        note="Two months inside a 16rem box. The cells keep their size and the box scrolls."
        title="Overflow — narrow container"
      >
        <div className="w-64 max-w-full overflow-x-auto rounded-lg bg-background">
          <Calendar defaultMonth={MONTH} mode="single" numberOfMonths={2} />
        </div>
      </State>

      <State
        breaks="Navigation arrows that point the wrong way, or week order that stays left-to-right, in a right-to-left page."
        id="rtl"
        note="dir=rtl passed to the calendar. The previous and next arrows come from the chevron component; check which way they point and which side each sits on."
        title="Right-to-left"
      >
        <Surface>
          <Calendar defaultMonth={MONTH} dir="rtl" mode="single" />
        </Surface>
      </State>

      <State
        breaks="A day grid that only works with a pointer: every key in the table below has to move focus or select."
        id="keyboard"
        note="Tab into the grid; only one day is a tab stop."
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "← →", does: "Move focus by day." },
            { keys: "↑ ↓", does: "Move focus by week. With Shift, by year." },
            { keys: "PageUp / PageDown", does: "Move focus by month. With Shift, by year." },
            { keys: "Home / End", does: "Move focus to the start or end of the week." },
            { keys: "Enter / Space", does: "Select the focused day." },
          ]}
        >
          <Surface>
            <Calendar defaultMonth={MONTH} mode="single" />
          </Surface>
        </KeyboardPath>
      </State>

      <State
        breaks="Nothing — this state exists to record an absence."
        id="no-loading"
        note="Calendar has no loading state and no error state. Show a skeleton in its place while availability loads, and mark unavailable days with disabled."
        title="States Calendar deliberately does not have"
      >
        <Surface>
          <Calendar
            defaultMonth={MONTH}
            disabled={[day(8), day(9), day(15), day(16)]}
            mode="single"
          />
        </Surface>
      </State>

      <Aside title="Calendar versus DatePicker">
        <p>
          Calendar draws the month grid and nothing else: the selection mode, the value and the
          constraints are yours. <code>DatePicker</code> wraps it in a text field and a popover for
          the single-date case and exchanges <code>yyyy-MM-dd</code> strings.
        </p>
      </Aside>
    </DemoPage>
  );
}
