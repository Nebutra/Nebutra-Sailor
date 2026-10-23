export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus to and from the text input. Focusing it opens the list. The token remove buttons and the clear-all button are also in the tab order.",
    },
    {
      keys: ["Arrow Down", "Arrow Up"],
      does: "Moves the highlight through the options in the open list (cmdk).",
    },
    {
      keys: ["Enter"],
      does: "Adds the highlighted option, or the Create row when creatable. At maxSelected it calls onMaxSelected instead.",
    },
    {
      keys: ["Backspace", "Delete"],
      does: "With the input empty, removes the last token that is not fixed.",
    },
    { keys: ["Escape"], does: "Blurs the input, which closes the list." },
    { keys: ["Enter"], does: "On a focused remove button, removes that token." },
  ],
  a11y: [
    {
      title: "Give the input a name",
      body: "There is no label prop, and a placeholder is not a name. Pass inputProps={{ 'aria-label': 'Frameworks' }}, or an id with a matching label.",
    },
    {
      title: "Translate the button names",
      body: "Each token's remove button is named by removeLabel(label) and the clear-all button by clearAllLabel. Both default to English; their icons are aria-hidden.",
    },
    {
      title: "Say what an empty list means",
      body: "Without emptyIndicator a search with no matches leaves a blank list. Pass a short message.",
    },
    {
      title: "Focus is drawn on the control",
      body: "The ring appears on the bordered control while the input has keyboard focus (focus-visible), not on the input itself.",
    },
  ],
  dos: [
    {
      title: "Keep the selection in state",
      body: "The component re-syncs from value whenever its identity changes. Hold the array in state and pass it back from onValueChange.",
      code: "<MultipleSelector value={selected} onValueChange={setSelected} defaultOptions={options} />",
    },
    {
      title: "Explain a reached limit",
      body: "maxSelected stops further picks silently. Use onMaxSelected to tell the user why nothing happened.",
      code: "<MultipleSelector maxSelected={3} onMaxSelected={(max) => setNotice(max)} />",
    },
    {
      title: "Use fixed for values that must stay",
      body: "A fixed option has no remove button, survives clear-all and is skipped by Backspace.",
      code: '{ value: "owner", label: "Owner", fixed: true }',
    },
  ],
  donts: [
    {
      title: "Do not pass a new array literal as value",
      body: "A fresh array on every render re-syncs and resets the selection each time.",
      code: "<MultipleSelector value={[{ value: 'a', label: 'A' }]} />",
    },
    {
      title: "Do not use it for a single choice",
      body: "One value is a Select or a Combobox. This control exists for a set that grows and shrinks.",
    },
    {
      title: "Do not use onChange",
      body: "It is deprecated. onValueChange receives the same array.",
    },
  ],
};
