"use client";

import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@nebutra/ui/primitives";
import * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const LENGTHS = ["4", "6", "8"] as const;
const PATTERNS = {
  any: undefined,
  digits: "^\\d+$",
  letters: "^[a-zA-Z]+$",
  alphanumeric: "^[a-zA-Z0-9]+$",
} as const;
type PatternName = keyof typeof PATTERNS;

/** Slot index runs for one or two groups, split in the middle when `split`. */
function groupsOf(length: number, split: boolean): number[][] {
  const indexes = Array.from({ length }, (_, i) => i);
  if (!split) return [indexes];
  const half = Math.floor(length / 2);
  return [indexes.slice(0, half), indexes.slice(half)];
}

/** Holds the typed code so the slots, onComplete and a controlled value have something to show. */
function LiveOtp({
  length,
  split,
  pattern,
  disabled,
  invalid,
  initial,
  label,
  showStatus,
}: {
  length: number;
  split: boolean;
  pattern: string | undefined;
  disabled: boolean;
  invalid: boolean;
  initial: string;
  label: string;
  showStatus: boolean;
}) {
  const [value, setValue] = React.useState(initial);
  const [completed, setCompleted] = React.useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <InputOTP
        aria-label={label}
        disabled={disabled}
        maxLength={length}
        onComplete={setCompleted}
        onValueChange={(next) => {
          setValue(next);
          setCompleted(null);
        }}
        value={value}
        {...present({ pattern, "aria-invalid": invalid ? true : undefined })}
      >
        {groupsOf(length, split).map((group, g) => (
          <React.Fragment key={group[0]}>
            {g > 0 ? <InputOTPSeparator /> : null}
            <InputOTPGroup>
              {group.map((index) => (
                <InputOTPSlot
                  className={invalid ? "border-destructive" : undefined}
                  index={index}
                  key={index}
                />
              ))}
            </InputOTPGroup>
          </React.Fragment>
        ))}
      </InputOTP>
      {showStatus ? (
        <p aria-live="polite" className="text-muted-foreground text-xs">
          {completed ? `onComplete fired with ${completed}` : `Value: ${value || "empty"}`}
        </p>
      ) : null}
    </div>
  );
}

export function Playground(_: DemoProps) {
  const knobs: Knob[] = [
    { name: "maxLength", type: "select", options: LENGTHS, defaultValue: "6" },
    {
      name: "pattern",
      type: "select",
      options: Object.keys(PATTERNS),
      defaultValue: "any",
      hint: "A pattern rejects typed and pasted text that would break it.",
    },
    {
      name: "split",
      type: "boolean",
      defaultValue: false,
      hint: "Two groups with an InputOTPSeparator between.",
    },
    { name: "disabled", type: "boolean", defaultValue: false },
    {
      name: "invalid",
      type: "boolean",
      defaultValue: false,
      hint: "No error prop: sets aria-invalid and a destructive border on each slot.",
    },
  ];

  return (
    <ComponentPlayground
      caption="Click the slots and type, or paste a code. onComplete fires when the code reaches maxLength. InputOTP has no loading state and no error prop; invalid is composed from aria-invalid and slot classes."
      code={(v) => {
        const length = Number(v.maxLength);
        const split = Boolean(v.split);
        const pattern = PATTERNS[v.pattern as PatternName];
        const groups = groupsOf(length, split).map((group) =>
          jsx({
            name: "InputOTPGroup",
            props: {},
            children: group.map((index) =>
              jsx({
                name: "InputOTPSlot",
                props: {
                  index,
                  className: v.invalid ? "border-destructive" : undefined,
                },
              }),
            ),
          }),
        );
        const children = groups.flatMap((group, i) =>
          i > 0 ? [jsx({ name: "InputOTPSeparator", props: {} }), group] : [group],
        );
        const body = jsx({
          name: "InputOTP",
          props: {
            maxLength: length,
            pattern,
            "aria-label": "Verification code",
            "aria-invalid": v.invalid ? true : undefined,
            disabled: v.disabled,
            value: raw("code"),
            onValueChange: raw("setCode"),
          },
          children,
        });
        const names = ["InputOTP", "InputOTPGroup", "InputOTPSlot"];
        if (split) names.push("InputOTPSeparator");
        return `"use client";\n\n${snippet({
          imports: [
            { names, from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function VerifyCode(): ReactElement {\n  const [code, setCode] = useState("");\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={knobs}
      render={(v) => (
        <LiveOtp
          disabled={Boolean(v.disabled)}
          initial=""
          invalid={Boolean(v.invalid)}
          label="Verification code"
          length={Number(v.maxLength)}
          pattern={PATTERNS[v.pattern as PatternName]}
          showStatus
          split={Boolean(v.split)}
        />
      )}
    />
  );
}

const COLUMNS = [
  { id: "empty", label: "Empty" },
  { id: "partial", label: "Partly filled" },
  { id: "filled", label: "Filled" },
  { id: "split", label: "Grouped" },
  { id: "disabled", label: "Disabled" },
  { id: "invalid", label: "Invalid" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note="Rows are code lengths: InputOTP has no size prop, and each slot is a fixed 40px cell. Invalid is composed from aria-invalid and a slot border class, since there is no error prop; there is no loading state. Focus a cell with Tab or a click to see the active slot ring and caret."
      render={(length, column) => {
        const n = Number(length);
        const initial =
          column === "empty"
            ? ""
            : "123456789".slice(0, column === "partial" ? Math.ceil(n / 2) : n);
        return (
          <LiveOtp
            disabled={column === "disabled"}
            initial={initial}
            invalid={column === "invalid"}
            label={`${length} digit code, ${column}`}
            length={n}
            pattern={PATTERNS.digits}
            showStatus={false}
            split={column === "split"}
          />
        );
      }}
      rows={LENGTHS.map((length) => ({ id: length, label: `${length} slots` }))}
      rowsLabel="Length"
    />
  );
}
