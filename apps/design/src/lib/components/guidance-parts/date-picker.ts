export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves between the text field and the calendar button, which are separate tab stops. A disabled picker is skipped.",
    },
    {
      keys: ["Enter", "Space"],
      does: "On the calendar button, opens the calendar with focus on the selected day.",
    },
    { keys: ["← → ↑ ↓"], does: "In the calendar, moves focus by day and by week." },
    { keys: ["PageUp", "PageDown"], does: "In the calendar, moves by month. With Shift, by year." },
    { keys: ["Home", "End"], does: "In the calendar, moves to the start or end of the week." },
    { keys: ["Enter"], does: "On a day, picks it and closes the calendar." },
    { keys: ["Esc"], does: "Closes the calendar without picking." },
  ],
  a11y: [
    {
      title: "A label needs an id",
      body: "label renders a <label for>, so pair it with id. Without a visible label, name the field with aria-label.",
    },
    {
      title: "Name the calendar button",
      body: "triggerLabel defaults to Open calendar. Pass a translated string in other locales.",
    },
    {
      title: "Error text is announced",
      body: "A string error renders with role=alert and sets aria-invalid. A boolean error flags the field without a message.",
    },
    {
      title: "Typing stays available",
      body: "The field is a real text input, so a far-off date can be entered without paging through months.",
    },
  ],
  dos: [
    {
      title: "Exchange ISO strings",
      body: "value and onValueChange use yyyy-MM-dd whatever displayFormat shows, the same string input type=date produced.",
      code: '<DatePicker id="due" label="Due date" value={date} onValueChange={setDate} />',
    },
    {
      title: "Bound the calendar and the text",
      body: "min and max disable days in the grid and reject a typed date outside them: the value is not committed and the field is marked invalid until blur. Still validate on submit, because a bound says nothing about required or cross-field rules.",
      code: '<DatePicker id="launch" label="Launch" min="2026-10-05" max="2026-10-28" />',
    },
  ],
  donts: [
    {
      title: "Don't use input type=date",
      body: "Its picker is drawn by the OS and ignores the theme.",
      code: '<input type="date" />',
    },
    {
      title: "Don't treat min and max as validation",
      body: "They keep out-of-range dates from committing, but they show no message and know nothing about required or cross-field rules. Validate on submit.",
      code: '<DatePicker min="2026-10-05" onValueChange={save} />',
    },
  ],
};
