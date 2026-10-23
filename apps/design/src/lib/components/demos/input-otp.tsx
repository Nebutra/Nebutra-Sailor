"use client";

import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@nebutra/ui/primitives";
import * as React from "react";
import { DemoPage, KeyboardPath, Row, Specimen, Stack, State } from "../demo-kit";

/** A code field with local state, split into groups of the given sizes. */
function Otp({
  groups,
  label,
  invalid = false,
  initial = "",
  describedBy,
  ...props
}: {
  groups: number[];
  label: string;
  invalid?: boolean;
  initial?: string;
  describedBy?: string;
  disabled?: boolean;
  pattern?: string;
}) {
  const [value, setValue] = React.useState(initial);
  const total = groups.reduce((sum, size) => sum + size, 0);
  let start = 0;

  return (
    <InputOTP
      aria-label={label}
      maxLength={total}
      onValueChange={setValue}
      value={value}
      {...props}
      {...(invalid ? { "aria-invalid": true } : {})}
      {...(describedBy ? { "aria-describedby": describedBy } : {})}
    >
      {groups.map((size, g) => {
        const first = start;
        start += size;
        return (
          // The group list is fixed for a given demo, so position is a stable key.
          <React.Fragment key={g}>
            {g > 0 ? <InputOTPSeparator /> : null}
            <InputOTPGroup>
              {Array.from({ length: size }, (_, i) => (
                <InputOTPSlot
                  className={invalid ? "border-destructive" : undefined}
                  index={first + i}
                  key={first + i}
                />
              ))}
            </InputOTPGroup>
          </React.Fragment>
        );
      })}
    </InputOTP>
  );
}

export default function InputOtpDemo() {
  const [completed, setCompleted] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");

  return (
    <DemoPage>
      <State
        breaks="Slots that fall out of step with the underlying input, so the highlighted cell is not where the next character lands. Click a cell and type."
        code={`<InputOTP maxLength={6} aria-label="Verification code">
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>`}
        id="default"
        note="Six slots in two groups. The empty field shows a blinking caret in the first slot once focused."
        title="Default"
      >
        <Otp groups={[3, 3]} label="Verification code" />
      </State>

      <State
        breaks="A length that wraps or clips: each slot is a fixed 40px cell, so eight slots plus gaps is the widest layout the page expects to host."
        id="lengths"
        note="Four, six and eight slots. InputOTP has no size prop; the slot size is fixed."
        title="Code lengths"
      >
        <Stack>
          <Specimen label="4 slots">
            <Otp groups={[4]} label="4 digit code" />
          </Specimen>
          <Specimen label="6 slots, grouped 3 + 3">
            <Otp groups={[3, 3]} label="6 digit code" />
          </Specimen>
          <Specimen label="8 slots, grouped 2 + 2 + 2 + 2">
            <Otp groups={[2, 2, 2, 2]} label="8 digit code" />
          </Specimen>
        </Stack>
      </State>

      <State
        breaks="A pattern that lets a rejected character through, or one that rejects a paste half-way and leaves a partial code."
        code={`<InputOTP maxLength={6} pattern="^\\d+$" aria-label="Digits only">…</InputOTP>`}
        id="pattern"
        note="Digits only on the left, letters only on the right. Type or paste the wrong kind of character: the whole keystroke or paste is ignored, not trimmed."
        title="Pattern"
      >
        <Row align="start">
          <Specimen label="pattern ^\d+$">
            <Otp groups={[6]} label="Digits only" pattern="^\d+$" />
          </Specimen>
          <Specimen label="pattern ^[a-zA-Z]+$">
            <Otp groups={[6]} label="Letters only" pattern="^[a-zA-Z]+$" />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="onComplete firing on every keystroke, or never firing because the field was uncontrolled. It needs a controlled value to fire."
        code={`<InputOTP
  maxLength={6}
  value={code}
  onValueChange={setCode}
  onComplete={(value) => verify(value)}
  aria-label="Verification code"
>…</InputOTP>`}
        id="complete"
        note="Fill all six slots. onComplete reports the finished code once; editing it clears the message."
        title="Controlled, with onComplete"
      >
        <Stack>
          <InputOTP
            aria-label="Verification code, controlled"
            maxLength={6}
            onComplete={setCompleted}
            onValueChange={(next) => {
              setCode(next);
              setCompleted(null);
            }}
            value={code}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot index={index} key={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {completed ? `Complete: ${completed}` : `Typed so far: ${code || "nothing"}`}
          </p>
        </Stack>
      </State>

      <State
        breaks="Filled slots that lose their characters when the value is set from outside, or a filled state with no way to tell it from an empty one."
        id="filled"
        note="A prefilled code, and one that is partly typed."
        title="Filled and partly filled"
      >
        <Row align="start">
          <Specimen label="filled">
            <Otp groups={[3, 3]} initial="482910" label="Filled code" />
          </Specimen>
          <Specimen label="partly filled">
            <Otp groups={[3, 3]} initial="482" label="Partly filled code" />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A disabled field that still takes focus or typing, or one that looks the same as an enabled one."
        id="disabled"
        note="disabled blocks focus and input and dims the whole control to half opacity. Tab skips it."
        title="Disabled"
      >
        <Row align="start">
          <Specimen label="disabled, empty">
            <Otp disabled groups={[3, 3]} label="Disabled code" />
          </Specimen>
          <Specimen label="disabled, filled">
            <Otp disabled groups={[3, 3]} initial="482910" label="Disabled filled code" />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="An invalid code that is only red. There is no error prop, so the page has to set aria-invalid and say what is wrong in text."
        code={`<InputOTP maxLength={6} aria-invalid aria-describedby="code-error">
  <InputOTPGroup>
    <InputOTPSlot index={0} className="border-destructive" />
    …
  </InputOTPGroup>
</InputOTP>
<p id="code-error" className="text-destructive-strong text-sm">That code has expired.</p>`}
        id="invalid"
        note="Composed by the caller: aria-invalid on InputOTP, a destructive border on each slot through className, and a message tied in with aria-describedby."
        title="Invalid (composed)"
      >
        <Stack>
          <InvalidOtp />
        </Stack>
      </State>

      <State
        breaks="Slots that shrink, wrap or overlap in a narrow container. They are fixed-width flex items, so the parent has to scroll or the row spills."
        id="overflow"
        note="Ten slots in a 16rem box. The slots keep their size and the box scrolls; nothing wraps."
        title="Overflow — narrow container"
      >
        <div className="w-64 max-w-full overflow-x-auto rounded-lg bg-background p-3">
          <Otp groups={[10]} label="Ten character code" />
        </div>
      </State>

      <State
        breaks="Slot ends and borders that are written with physical left and right classes (first:rounded-l-md, border-r), so a right-to-left page rounds the inner edge and doubles a border."
        id="rtl"
        note="The same six slots under dir=rtl. Look at which corners are rounded and where the borders meet."
        title="Right-to-left"
      >
        <div dir="rtl">
          <Otp groups={[3, 3]} label="رمز التحقق" />
        </div>
      </State>

      <State
        breaks="A keyboard path that needs a pointer: the single underlying input has to be reachable and operable alone."
        id="keyboard"
        note="Tab lands on the underlying input, so the whole code is one tab stop."
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "Focus the field. The first empty slot shows the caret." },
            { keys: "0–9", does: "Type the code. Each character fills a slot and moves on." },
            { keys: "Backspace", does: "Delete the last character." },
            { keys: "Ctrl/⌘ + V", does: "Paste a whole code. It is cut to the slot count." },
          ]}
        >
          <Otp groups={[3, 3]} label="Keyboard path code" pattern="^\d+$" />
        </KeyboardPath>
      </State>

      <State
        breaks="Nothing — this state exists to record an absence."
        id="no-loading"
        note="InputOTP has no loading state and no error prop. To show a pending verification, disable the field and show a Spinner beside it; to show an error, compose it as above."
        title="States InputOTP deliberately does not have"
      >
        <Row>
          <Otp disabled groups={[3, 3]} initial="482910" label="Verifying code" />
        </Row>
      </State>
    </DemoPage>
  );
}

function InvalidOtp() {
  return (
    <div className="grid gap-2">
      <Otp
        describedBy="otp-expired"
        groups={[3, 3]}
        initial="482910"
        invalid
        label="Expired code"
      />
      <p className="text-destructive-strong text-sm" id="otp-expired">
        That code has expired. Request a new one.
      </p>
    </div>
  );
}
