"use client";

import { Calendar } from "@nebutra/ui/primitives";
import * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const MODES = ["single", "multiple", "range"] as const;
type Mode = (typeof MODES)[number];
type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;
interface DayRange {
  from: Date | undefined;
  to?: Date | undefined;
}

/** A fixed month, so selections stay in view and the page does not depend on today's date. */
const MONTH = new Date(2026, 9, 1);
const WEEKENDS = { dayOfWeek: [0, 6] };

interface CalendarOptions {
  disableWeekends?: boolean;
  fixedWeeks?: boolean;
  numberOfMonths?: number;
  showOutsideDays?: boolean;
  showWeekNumber?: boolean;
  weekStartsOn?: WeekStart | undefined;
  dir?: "ltr" | "rtl" | undefined;
  /** Open on the fixed October 2026 month instead of the current one. */
  pinned?: boolean;
  /** Start with a selection already made. */
  preselect?: boolean;
}

/** One calendar in any selection mode, holding its own selection. */
function LiveCalendar({ mode, ...options }: { mode: Mode } & CalendarOptions) {
  const [single, setSingle] = React.useState<Date | undefined>(
    options.preselect ? new Date(2026, 9, 14) : undefined,
  );
  const [multiple, setMultiple] = React.useState<Date[] | undefined>(
    options.preselect ? [new Date(2026, 9, 6), new Date(2026, 9, 13), new Date(2026, 9, 20)] : [],
  );
  const [range, setRange] = React.useState<DayRange | undefined>(
    options.preselect ? { from: new Date(2026, 9, 12), to: new Date(2026, 9, 16) } : undefined,
  );

  const shared = {
    ...(options.pinned ? { defaultMonth: MONTH } : {}),
    ...(options.disableWeekends ? { disabled: WEEKENDS } : {}),
    ...present({
      dir: options.dir,
      fixedWeeks: options.fixedWeeks,
      numberOfMonths: options.numberOfMonths,
      showOutsideDays: options.showOutsideDays,
      showWeekNumber: options.showWeekNumber,
      weekStartsOn: options.weekStartsOn,
    }),
  };

  if (mode === "multiple") {
    return <Calendar {...shared} mode="multiple" onSelect={setMultiple} selected={multiple} />;
  }
  if (mode === "range") {
    return <Calendar {...shared} mode="range" onSelect={setRange} selected={range} />;
  }
  return <Calendar {...shared} mode="single" onSelect={setSingle} selected={single} />;
}

export function Playground(_: DemoProps) {
  const knobs: Knob[] = [
    { name: "mode", type: "select", options: MODES, defaultValue: "single" },
    { name: "numberOfMonths", type: "select", options: ["1", "2"], defaultValue: "1" },
    {
      name: "weekStartsOn",
      type: "select",
      options: ["locale", "0", "1", "6"],
      defaultValue: "locale",
    },
    { name: "showOutsideDays", type: "boolean", defaultValue: true },
    { name: "fixedWeeks", type: "boolean", defaultValue: false },
    { name: "showWeekNumber", type: "boolean", defaultValue: false },
    {
      name: "disableWeekends",
      type: "boolean",
      defaultValue: false,
      hint: "A disabled matcher: dayOfWeek 0 and 6.",
    },
    { name: "dir", type: "select", options: ["ltr", "rtl"], defaultValue: "ltr" },
  ];

  return (
    <ComponentPlayground
      caption="Pick days with the pointer or the arrow keys. Calendar owns presentation only: the selection lives in your state. It has no loading state."
      code={(v) => {
        const mode = v.mode as Mode;
        const weekStartsOn = v.weekStartsOn === "locale" ? undefined : Number(v.weekStartsOn);
        const stateType =
          mode === "multiple"
            ? "Date[] | undefined"
            : mode === "range"
              ? "DateRange | undefined"
              : "Date | undefined";
        const initial = mode === "multiple" ? "[]" : "undefined";
        const body = jsx({
          name: "Calendar",
          defaults: { showOutsideDays: true },
          props: {
            mode,
            selected: raw("selected"),
            onSelect: raw("setSelected"),
            numberOfMonths: v.numberOfMonths === "1" ? undefined : Number(v.numberOfMonths),
            weekStartsOn,
            showOutsideDays: v.showOutsideDays,
            fixedWeeks: v.fixedWeeks,
            showWeekNumber: v.showWeekNumber,
            disabled: v.disableWeekends ? raw("{ dayOfWeek: [0, 6] }") : undefined,
            dir: v.dir === "ltr" ? undefined : String(v.dir),
          },
        });
        return `"use client";\n\n${snippet({
          imports: [
            { names: ["Calendar"], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useState"], from: "react" },
            ...(mode === "range" ? [{ names: ["type DateRange"], from: "react-day-picker" }] : []),
          ],
          body: `export function DayPicker(): ReactElement {\n  const [selected, setSelected] = useState<${stateType}>(${initial});\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={knobs}
      render={(v) => (
        <LiveCalendar
          dir={v.dir as "ltr" | "rtl"}
          disableWeekends={Boolean(v.disableWeekends)}
          fixedWeeks={Boolean(v.fixedWeeks)}
          mode={v.mode as Mode}
          numberOfMonths={Number(v.numberOfMonths)}
          showOutsideDays={Boolean(v.showOutsideDays)}
          showWeekNumber={Boolean(v.showWeekNumber)}
          weekStartsOn={
            v.weekStartsOn === "locale" ? undefined : (Number(v.weekStartsOn) as WeekStart)
          }
        />
      )}
    />
  );
}

const COLUMNS = [
  { id: "today", label: "Current month" },
  { id: "selected", label: "Selected" },
  { id: "disabled", label: "Disabled weekends" },
  { id: "outside", label: "No outside days" },
  { id: "weeks", label: "Week numbers" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note="Rows are selection modes: Calendar has no size prop, the cell size comes from the calendar tokens. Current month opens on today, outlined; the other columns are pinned to October 2026 so the selection stays in view. Hover a day, or Tab into a grid and use the arrow keys. There is no loading state."
      render={(mode, column) => (
        <LiveCalendar
          disableWeekends={column === "disabled"}
          mode={mode as Mode}
          pinned={column !== "today"}
          preselect={column === "selected"}
          showOutsideDays={column !== "outside"}
          showWeekNumber={column === "weeks"}
        />
      )}
      rows={MODES.map((mode) => ({ id: mode, label: mode }))}
      rowsLabel="Mode"
    />
  );
}
