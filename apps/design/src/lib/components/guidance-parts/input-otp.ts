export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus in and out. The slots are one input, so the whole code is a single tab stop. A disabled field is skipped.",
    },
    {
      keys: ["0–9", "A–Z"],
      does: "Types into the active slot and moves on, when the pattern allows the character.",
    },
    { keys: ["Backspace"], does: "Deletes the last typed character." },
    {
      keys: ["Ctrl + V", "⌘ + V"],
      does: "Pastes a code, cut to maxLength. If the pasted text breaks the pattern the whole paste is ignored.",
    },
  ],
  a11y: [
    {
      title: "Name the input",
      body: "There is no visible label. Pass aria-label or aria-labelledby, or wrap the field in a label, so the single input is announced with a name.",
    },
    {
      title: "Slots are not controls",
      body: "InputOTPSlot is a plain div. Assistive tech reads the one underlying input and its value, not the cells, and the separator is aria-hidden.",
    },
    {
      title: "Autofill works by default",
      body: 'The input carries autocomplete="one-time-code" and a numeric input mode, so SMS codes can be suggested and a phone shows the number pad.',
    },
    {
      title: "Invalid is composed, not built in",
      body: "There is no error prop. Set aria-invalid on InputOTP, add a destructive border to the slots through className, and link a text message with aria-describedby.",
    },
  ],
  dos: [
    {
      title: "Restrict the characters",
      body: "Set pattern for digit-only codes so a letter never lands in a slot.",
      code: '<InputOTP maxLength={6} pattern="^\\d+$" aria-label="Verification code">…</InputOTP>',
    },
    {
      title: "Submit on complete",
      body: "Control the value and use onComplete to verify as soon as the last character arrives.",
      code: "<InputOTP maxLength={6} value={code} onValueChange={setCode} onComplete={verify} />",
    },
  ],
  donts: [
    {
      title: "Don't rely on onComplete without a value",
      body: "onComplete only fires when value is controlled. An uncontrolled field never calls it.",
      code: "<InputOTP maxLength={6} onComplete={verify} />",
    },
    {
      title: "Don't ship it unnamed",
      body: "Without a label the single input is announced as an empty edit field.",
      code: "<InputOTP maxLength={6}>…</InputOTP>",
    },
  ],
};
