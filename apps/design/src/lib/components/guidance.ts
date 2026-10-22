/**
 * Keyboard, accessibility and usage guidance for a component page.
 *
 * This is the editorial layer. Props come from the types; how a keyboard path
 * behaves and when to reach for a component are claims about behaviour, and
 * the only honest source for them is reading the implementation and trying it.
 * Each entry below was checked against the source file named on its page and
 * the live specimen next to it. A component with no entry simply has no such
 * section; nothing is padded.
 *
 * Plain data, no JSX, so the server renders it without shipping it to the
 * client.
 */

export interface KeyRow {
  /** Alternatives: any one of them does it. */
  keys: string[];
  does: string;
}

export interface Rule {
  title: string;
  body: string;
  code?: string;
}

export interface Guidance {
  keyboard?: KeyRow[];
  a11y?: { title: string; body: string }[];
  dos?: Rule[];
  donts?: Rule[];
}

export const GUIDANCE: Record<string, Guidance> = {
  button: {
    keyboard: [
      {
        keys: ["Tab", "Shift + Tab"],
        does: "Moves focus to and from the button. Disabled and loading buttons are skipped.",
      },
      { keys: ["Enter", "Space"], does: "Activates the focused button." },
      {
        keys: ["Enter"],
        does: "On a ButtonLink, follows the link. Space does not, because it is an anchor.",
      },
    ],
    a11y: [
      {
        title: "Name icon-only buttons",
        body: "A button with shape square or circle and no text has no accessible name. Pass aria-label.",
      },
      {
        title: "Loading is announced, not just shown",
        body: "loading sets aria-busy and disables the button. The spinner only appears after a short delay, so a fast save never flashes one.",
      },
      {
        title: "Prefix and suffix are decoration",
        body: "Both are aria-hidden. The label carries the name; do not rely on the icon to say what the button does.",
      },
      {
        title: "One focus ring, from the page",
        body: "The ring comes from the global :focus-visible rule. A ring added on the component draws twice.",
      },
    ],
    dos: [
      {
        title: "Name the outcome",
        body: "Say what happens: Deploy, Delete workspace, Save changes. One default-variant button per view marks the main action.",
        code: "<Button>Deploy</Button>",
      },
      {
        title: "Use loading for pending work",
        body: "Keep the label and let loading disable the button, so the width does not jump and a second click cannot fire.",
        code: "<Button loading={isSaving}>Save changes</Button>",
      },
      {
        title: "Use ButtonLink to navigate",
        body: "Same variants, but a real anchor: middle-click, open in new tab and the status bar URL all work.",
        code: '<ButtonLink href="/docs">Read the docs</ButtonLink>',
      },
    ],
    donts: [
      {
        title: "Don't navigate from onClick",
        body: "A button that calls router.push cannot be opened in a new tab or announced as a link.",
        code: '<Button onClick={() => router.push("/docs")}>Docs</Button>',
      },
      {
        title: "Don't recolour with className",
        body: "Pick a variant. A local background class drifts from the theme and from dark mode.",
        // allow-palette: this is the Don't example showing a raw palette class.
        code: '<Button className="bg-red-600">Delete</Button>',
      },
      {
        title: "Don't ship an unnamed icon button",
        body: "Screen readers announce it as just “button”.",
        code: '<Button shape="square"><Plus /></Button>',
      },
    ],
  },

  input: {
    keyboard: [
      {
        keys: ["Tab", "Shift + Tab"],
        does: "Moves focus in and out. The clear and reveal buttons, when shown, are separate tab stops after the field.",
      },
      {
        keys: ["Esc"],
        does: "Clears a non-empty search field and keeps focus in it. Stops there, so a surrounding dialog does not close. Opt in for other types with clearOnEscape.",
      },
      {
        keys: ["Enter", "Space"],
        does: "On the clear button, clears the field and returns focus to it. On the reveal button, toggles the password and returns focus to the field.",
      },
    ],
    a11y: [
      {
        title: "A label needs an id",
        body: "label renders a <label for>, so the types require id with it. Without a label, name the field with aria-label.",
      },
      {
        title: "Description and error are linked",
        body: "description and a string error are tied to the field with aria-describedby. An error also sets aria-invalid.",
      },
      {
        title: "Boolean error only flags",
        body: "error={true} marks the field invalid but says nothing. Pass the message as a string so it is read out.",
      },
      {
        title: "Translate the control labels",
        body: "clearLabel, revealLabel and hideLabel default to English. Pass translated strings in other locales.",
      },
    ],
    dos: [
      {
        title: "Label every field",
        body: "Use the label prop, or wrap in Field. The label stays visible after the user types.",
        code: '<Input id="email" label="Work email" />',
      },
      {
        title: "Say how to fix the error",
        body: "Write what to do, not what went wrong.",
        code: '<Input error="Enter an address like name@company.com" id="email" label="Email" />',
      },
      {
        title: "Set type and autoComplete",
        body: "They bring the right mobile keyboard and let the browser fill the field.",
        code: '<Input autoComplete="email" id="email" label="Email" type="email" />',
      },
    ],
    donts: [
      {
        title: "Don't use the placeholder as the label",
        body: "It disappears on input and is too low in contrast to be the only name.",
        code: '<Input placeholder="Email" />',
      },
      {
        title: "Don't signal an error with colour alone",
        body: "error={true} turns the border red and nothing else. Add the message.",
        code: "<Input error />",
      },
      {
        title: "Don't disable a field to show a value",
        body: "A disabled field cannot be focused or copied. Use readOnly.",
        code: '<Input disabled defaultValue="ws_8f2a" />',
      },
    ],
  },

  select: {
    keyboard: [
      {
        keys: ["Tab", "Shift + Tab"],
        does: "Moves focus to and from the trigger.",
      },
      {
        keys: ["Enter", "Space", "↓"],
        does: "Opens the list from the trigger.",
      },
      { keys: ["↑", "↓"], does: "Moves through the options. Disabled options are skipped." },
      { keys: ["Home", "End"], does: "Jumps to the first or last option." },
      { keys: ["A–Z"], does: "Type-ahead: jumps to the option starting with the typed text." },
      { keys: ["Enter"], does: "Selects the highlighted option and closes the list." },
      {
        keys: ["Esc"],
        does: "Closes the list without changing the value and returns focus to the trigger.",
      },
    ],
    a11y: [
      {
        title: "The popup is part of the system",
        body: "The default is a themed listbox, not the OS control, so the open list follows light and dark. A raw select cannot, and is lint-banned in apps.",
      },
      {
        title: "Give it a name",
        body: "Pass label. A placeholder is a prompt for the empty state, not an accessible name.",
      },
      {
        title: "Say why an option is unavailable",
        body: "disabled options stay visible so the choice is not a mystery. Put the reason in the label.",
      },
    ],
    dos: [
      {
        title: "Use it for a known list of five or more",
        body: "Fewer than five options are quicker to scan as a RadioGroup.",
        code: '<Select label="Region" options={regions} />',
      },
      {
        title: "Keep disabled options and explain them",
        body: "Hiding Sydney makes users wonder where it went.",
        code: '{ value: "syd1", label: "Sydney — at capacity", disabled: true }',
      },
    ],
    donts: [
      {
        title: "Don't use a raw <select>",
        body: "It cannot be themed, and its popup ignores dark mode.",
        code: "<select>…</select>",
      },
      {
        title: "Don't use it for long, searchable lists",
        body: "Past a screenful, people need to type to filter. Use Combobox.",
      },
      {
        title: 'Don\'t use value="" as “all”',
        body: "An empty string is not a usable option value. Use a sentinel and map it.",
        code: '{ value: "__all__", label: "All regions" }',
      },
    ],
  },

  dialog: {
    keyboard: [
      { keys: ["Enter", "Space"], does: "Opens the dialog from its trigger." },
      {
        keys: ["Tab", "Shift + Tab"],
        does: "Cycles through the dialog's controls. Focus stays inside; the page behind is out of reach.",
      },
      { keys: ["Esc"], does: "Closes the dialog and returns focus to the trigger." },
    ],
    a11y: [
      {
        title: "Title names the dialog",
        body: "DialogTitle is the accessible name and DialogDescription the description. Leave the title out and the dialog is announced with no name.",
      },
      {
        title: "Focus is managed for you",
        body: "Focus moves in on open, is trapped while open and goes back to the trigger on close. Do not add your own.",
      },
      {
        title: "The close button is named",
        body: "DialogContent renders a close control with a screen-reader label. Do not add a second one in the header.",
      },
      {
        title: "Block double submits",
        body: "While a request is in flight, disable both footer buttons so the dialog cannot be confirmed twice or abandoned half-done.",
      },
    ],
    dos: [
      {
        title: "Title it with the action",
        body: "“Delete workspace”, not “Are you sure?”. Name the footer buttons for outcomes too: Delete, not OK.",
        code: "<DialogTitle>Delete workspace</DialogTitle>",
      },
      {
        title: "Mark the irreversible one",
        body: "Use the destructive variant on the confirming button and a plain outline Cancel beside it.",
        code: '<Button variant="destructive">Delete</Button>',
      },
    ],
    donts: [
      {
        title: "Don't open a dialog from a dialog",
        body: "Stacked modals trap focus twice over and bury the way back. Replace the content, or change the flow.",
      },
      {
        title: "Don't put a long form in one",
        body: "A dialog is for a decision or a short entry. Anything longer belongs on a page or in a Drawer.",
      },
      {
        title: "Don't use it for news",
        body: "A message that needs no decision should be a Toast or an Alert, not something that blocks the page.",
      },
    ],
  },

  table: {
    keyboard: [
      {
        keys: ["Tab", "Shift + Tab"],
        does: "Reaches only what you put in cells: links, buttons, checkboxes. The table and its rows are not focusable.",
      },
      {
        keys: ["Enter", "Space"],
        does: "Activates the focused control inside a cell, as it would anywhere else.",
      },
    ],
    a11y: [
      {
        title: "It is a real <table>",
        body: 'Rows, cells and headers keep native semantics. Head cells default to scope="col"; set scope="row" on a row header.',
      },
      {
        title: "Add a caption",
        body: "Table.Caption names the table for screen readers and sits under it. Without one, the table is announced anonymously.",
      },
      {
        title: "interactive is a tint, not a behaviour",
        body: "It tints a row on hover and when focus is inside it. It does not make the row focusable or activatable. Put a link or button in the row.",
      },
      {
        title: "A wide table scrolls, and the scroller is not a tab stop",
        body: "Keep a focusable control in the first column so keyboard users can scroll sideways to the rest.",
      },
    ],
    dos: [
      {
        title: "Right-align numbers",
        body: "numeric on both the head and the cell aligns the digits and switches to tabular figures, so a column can be scanned and totalled.",
        code: "<Table.Cell numeric>{count.toLocaleString()}</Table.Cell>",
      },
      {
        title: "Set alignment on a text last column",
        body: 'The last column right-aligns by default, as an action column. Text there needs alignment="start".',
        code: '<Table.Cell alignment="start">{note}</Table.Cell>',
      },
      {
        title: "Use striped for dense data",
        body: "It is a prop on Table.Body. Hand-applied stripes drift from row to row.",
        code: "<Table.Body striped>…</Table.Body>",
      },
    ],
    donts: [
      {
        title: "Don't build a table from divs",
        body: "It loses the header-to-cell association that screen readers use to read a row.",
      },
      {
        title: "Don't make a whole row clickable with onClick",
        body: "Keyboard and screen-reader users cannot reach it. Link the primary cell, and let interactive style the row.",
        code: "<Table.Row onClick={open}>…</Table.Row>",
      },
      {
        title: "Don't use it for layout",
        body: "It is for tabular data. Two columns of unrelated content is a grid.",
      },
    ],
  },

  toast: {
    keyboard: [
      {
        keys: ["Alt + T"],
        does: "Moves focus into the notification region, from anywhere on the page (Sonner's default hotkey).",
      },
      {
        keys: ["Tab", "Shift + Tab"],
        does: "Moves between toasts and their action and close buttons.",
      },
      {
        keys: ["Enter", "Space"],
        does: "Activates the focused action (such as Undo) or the close button.",
      },
      { keys: ["Esc"], does: "Collapses the expanded stack while focus is inside it." },
    ],
    a11y: [
      {
        title: "A polite live region",
        body: 'The region is aria-live="polite", labelled “Notifications”. New toasts are announced without taking focus. Change the label with containerAriaLabel.',
      },
      {
        title: "Timers pause while you read",
        body: "A toast does not dismiss while the stack is expanded, being interacted with, or the tab is hidden.",
      },
      {
        title: "Use preserve for anything that needs action",
        body: "A message the user must act on should not vanish on a timer. preserve keeps it until it is dismissed.",
      },
      {
        title: "Never the only signal",
        body: "A toast is gone in seconds. The result of an action also has to show in the page: the row appears, the badge changes.",
      },
    ],
    dos: [
      {
        title: "Confirm what already happened",
        body: "“Project renamed”. Short, past tense, no punctuation fuss.",
        code: 'const toasts = useToasts();\ntoasts.success("Project renamed");',
      },
      {
        title: "Offer Undo for reversible actions",
        body: "onUndoAction adds an Undo button and extends the toast to seven seconds.",
        code: 'toasts.message({ text: "Project archived", onUndoAction: restore });',
      },
      {
        title: "Mount one Toaster",
        body: "Once, near the root. useToasts() and toast() work from any component below or beside it.",
        code: "<Toaster />",
      },
    ],
    donts: [
      {
        title: "Don't put errors the user must fix in a toast",
        body: "A field error belongs on the field; a blocking failure belongs in an Alert that stays.",
      },
      {
        title: "Don't stack several at once",
        body: "Three are shown and the rest queue behind them. If you need more, the surface is wrong.",
      },
      {
        title: "Don't mount a Toaster per page",
        body: "Two regions double-announce every message.",
        code: "<Toaster /> {/* in a page, and again in the layout */}",
      },
    ],
  },
};
