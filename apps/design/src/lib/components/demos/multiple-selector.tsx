"use client";

import { MultipleSelector, type MultipleSelectorOption, Spinner } from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, Specimen, State } from "../demo-kit";

const FRAMEWORKS: MultipleSelectorOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
  { value: "solid", label: "Solid" },
  { value: "angular", label: "Angular", disable: true },
  { value: "next", label: "Next.js" },
];

const GROUPED: MultipleSelectorOption[] = [
  { value: "react", label: "React", group: "Library" },
  { value: "vue", label: "Vue", group: "Library" },
  { value: "svelte", label: "Svelte", group: "Compiler" },
  { value: "solid", label: "Solid", group: "Compiler" },
  { value: "next", label: "Next.js", group: "Framework" },
];

const MANY: MultipleSelectorOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
  { value: "solid", label: "Solid" },
  { value: "next", label: "Next.js" },
  { value: "nuxt", label: "Nuxt" },
  { value: "remix", label: "Remix" },
];

// Selections passed as `value` live at module level: the component re-syncs from
// `value` whenever its identity changes, so an array literal in render would reset it.
const ONE: MultipleSelectorOption[] = [{ value: "react", label: "React" }];
const TWO: MultipleSelectorOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
];
const LONG_SELECTED: MultipleSelectorOption[] = [{ value: "long", label: LONG_LABEL }];
const FIXED: MultipleSelectorOption[] = [
  { value: "react", label: "React", fixed: true },
  { value: "vue", label: "Vue" },
];

function matches(query: string): MultipleSelectorOption[] {
  return FRAMEWORKS.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));
}

async function searchSlowly(query: string): Promise<MultipleSelectorOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return matches(query);
}

/** Reserves room for the open list, which is absolutely positioned under the control. */
function Field({ children }: { children: React.ReactNode }) {
  return <div className="min-h-64 w-80 max-w-full">{children}</div>;
}

export default function MultipleSelectorDemo() {
  const [fixed, setFixed] = React.useState<MultipleSelectorOption[]>(FIXED);
  const [limit, setLimit] = React.useState<number | null>(null);
  const [many, setMany] = React.useState<MultipleSelectorOption[]>(MANY);

  return (
    <DemoPage>
      <State
        breaks="A list that does not open on focus, or whose filter is case-sensitive. Click in, type “sv”, press Enter."
        code={`<MultipleSelector
  defaultOptions={frameworks}
  emptyIndicator="No results."
  inputProps={{ "aria-label": "Frameworks" }}
  placeholder="Select frameworks"
/>`}
        id="default"
        note="Focus opens the list; picking an option adds a token and removes it from the list. Angular is a disabled option."
        title="Default"
      >
        <Field>
          <MultipleSelector
            defaultOptions={FRAMEWORKS}
            emptyIndicator="No results."
            inputProps={{ "aria-label": "Frameworks" }}
            placeholder="Select frameworks"
          />
        </Field>
      </State>

      <State
        breaks="A fixed token that can be removed by its button, by Backspace, or by clear-all. Try all three on React."
        code={`const [selected, setSelected] = useState([
  { value: "react", label: "React", fixed: true },
  { value: "vue", label: "Vue" },
]);

<MultipleSelector
  defaultOptions={frameworks}
  onValueChange={setSelected}
  value={selected}
/>`}
        id="fixed"
        note="A fixed option has no remove button, is skipped by Backspace, and survives clear-all. The clear-all button disappears once only fixed tokens remain."
        title="Pre-selected, with a fixed token"
      >
        <Field>
          <MultipleSelector
            defaultOptions={FRAMEWORKS}
            inputProps={{ "aria-label": "Frameworks, with React fixed" }}
            onValueChange={setFixed}
            placeholder="Add more"
            value={fixed}
          />
        </Field>
      </State>

      <State
        breaks="Typed text that cannot become a value, or a Create row that offers a value already selected. Type “Qwik” and press Enter."
        code={`<MultipleSelector creatable defaultOptions={frameworks} placeholder="Select or create" />`}
        id="creatable"
        note="creatable adds a Create row for text that matches nothing, and switches filtering to a case-insensitive substring match. The created option's value and label are the typed text."
        title="Creatable"
      >
        <Field>
          <MultipleSelector
            creatable
            defaultOptions={FRAMEWORKS}
            emptyIndicator="Type to create one."
            inputProps={{ "aria-label": "Frameworks, creatable" }}
            placeholder="Select or create"
          />
        </Field>
      </State>

      <State
        breaks="A limit that silently drops the pick. At the limit onMaxSelected must fire, so the page can say why nothing happened."
        code={`<MultipleSelector
  defaultOptions={frameworks}
  maxSelected={2}
  onMaxSelected={(max) => setMessage(\`Limit of \${max} reached\`)}
/>`}
        id="max-selected"
        note="Pick a third option. The message below is this page's own readout of onMaxSelected."
        title="Selection limit"
      >
        <Field>
          <MultipleSelector
            defaultOptions={FRAMEWORKS}
            inputProps={{ "aria-label": "Frameworks, at most two" }}
            maxSelected={2}
            onMaxSelected={setLimit}
            onValueChange={() => setLimit(null)}
            placeholder="Pick up to two"
          />
          {limit === null ? null : (
            <p className="mt-2 text-muted-foreground text-xs" role="status">
              Limit of {limit} reached. Remove one to add another.
            </p>
          )}
        </Field>
      </State>

      <State
        breaks="Group headings that repeat, or a group left empty after its options are picked."
        code={`<MultipleSelector defaultOptions={options} groupBy="group" />`}
        id="grouped"
        note="groupBy names the option key that holds the group. Options without it fall under an unnamed group."
        title="Grouped options"
      >
        <Field>
          <MultipleSelector
            defaultOptions={GROUPED}
            groupBy="group"
            inputProps={{ "aria-label": "Frameworks, grouped" }}
            placeholder="Select frameworks"
          />
        </Field>
      </State>

      <State
        breaks="An async search with no sign of progress, or one whose results flash an empty message while loading. The list shows loadingIndicator while the promise is pending."
        code={`<MultipleSelector
  delay={300}
  emptyIndicator="No matches."
  loadingIndicator={<Spinner size="sm" />}
  onSearch={async (query) => fetchFrameworks(query)}
/>`}
        id="async"
        note="Type “s”. After the 300ms debounce the list shows the spinner for about 700ms, then the results. Type “zzz” for the empty message."
        title="Async search — loading and empty"
      >
        <Field>
          <MultipleSelector
            delay={300}
            emptyIndicator="No matches."
            inputProps={{ "aria-label": "Frameworks, async" }}
            loadingIndicator={
              <p className="m-0 flex items-center gap-2 px-2 py-3 text-muted-foreground text-sm">
                <Spinner size="sm" /> Searching
              </p>
            }
            onSearch={searchSlowly}
            placeholder="Search frameworks"
          />
        </Field>
      </State>

      <State
        breaks="A sync search that shows a stale list, or never runs without text. It runs while the list is open, after the debounce; triggerSearchOnFocus also runs it on focus."
        code={`<MultipleSelector
  defaultOptions={frameworks}
  onSearchSync={(query) => matches(query)}
  triggerSearchOnFocus
/>`}
        id="sync-search"
        note="onSearchSync has no loading state. With triggerSearchOnFocus the full list appears on focus, without waiting for text."
        title="Sync search"
      >
        <Field>
          <MultipleSelector
            defaultOptions={FRAMEWORKS}
            delay={150}
            inputProps={{ "aria-label": "Frameworks, sync search" }}
            onSearchSync={matches}
            placeholder="Search frameworks"
            triggerSearchOnFocus
          />
        </Field>
      </State>

      <State
        breaks="A disabled selector that still lets tokens be removed, or does not look disabled. The input and the token buttons are disabled and the control is dimmed."
        code={`<MultipleSelector disabled value={selected} defaultOptions={frameworks} />`}
        id="disabled"
        title="Disabled"
      >
        <Row align="start">
          <Specimen label="empty">
            <div className="w-72 max-w-full">
              <MultipleSelector
                defaultOptions={FRAMEWORKS}
                disabled
                inputProps={{ "aria-label": "Disabled, empty" }}
                placeholder="Select frameworks"
              />
            </div>
          </Specimen>
          <Specimen label="with selection">
            <div className="w-72 max-w-full">
              <MultipleSelector
                defaultOptions={FRAMEWORKS}
                disabled
                inputProps={{ "aria-label": "Disabled, with selection" }}
                value={TWO}
              />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="The control keeping chrome the page does not want: a placeholder under the tokens, or a clear-all button and its reserved space."
        code={`<MultipleSelector hidePlaceholderWhenSelected hideClearAllButton defaultOptions={frameworks} />`}
        id="chrome"
        note="hidePlaceholderWhenSelected drops the placeholder once something is selected and lets the input take the full row. hideClearAllButton removes the clear-all button and its reserved space."
        title="Placeholder and clear-all"
      >
        <Row align="start">
          <Specimen label="hidePlaceholderWhenSelected">
            <div className="w-72 max-w-full">
              <MultipleSelector
                defaultOptions={FRAMEWORKS}
                hidePlaceholderWhenSelected
                inputProps={{ "aria-label": "Placeholder hidden" }}
                placeholder="Select frameworks"
                value={ONE}
              />
            </div>
          </Specimen>
          <Specimen label="hideClearAllButton">
            <div className="w-72 max-w-full">
              <MultipleSelector
                defaultOptions={FRAMEWORKS}
                hideClearAllButton
                inputProps={{ "aria-label": "No clear-all" }}
                value={TWO}
              />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="Many tokens pushing the control off its container or growing it without limit. Tokens wrap onto new lines and the control grows with them; the list opens below it."
        id="many"
        note="Seven tokens in a narrow field. Remove a few and the control shrinks back."
        title="Overflow — many tokens"
      >
        <Field>
          <MultipleSelector
            defaultOptions={MANY}
            inputProps={{ "aria-label": "Many selected" }}
            onValueChange={setMany}
            value={many}
          />
        </Field>
      </State>

      <State
        breaks="A token whose label is wider than the control. The token has no truncation, so a very long label is the case to watch: it either wraps the control or runs past the edge."
        id="long-label"
        note="Long labels are not truncated by the component. If your data can be long, shorten the label you pass or constrain the token with badgeClassName."
        title="Overflow — long label"
      >
        <Field>
          <MultipleSelector
            defaultOptions={FRAMEWORKS}
            inputProps={{ "aria-label": "Long label" }}
            value={LONG_SELECTED}
          />
        </Field>
      </State>

      <State
        breaks="Remove and clear-all buttons announced in English on a translated page. removeLabel and clearAllLabel take the translated strings."
        code={`<MultipleSelector
  clearAllLabel="Borrar todo"
  defaultOptions={frameworks}
  removeLabel={(label) => \`Quitar \${label}\`}
/>`}
        id="labels"
        note="Inspect the buttons: their accessible names are Spanish."
        title="Translated button labels"
      >
        <Field>
          <MultipleSelector
            clearAllLabel="Borrar todo"
            defaultOptions={FRAMEWORKS}
            inputProps={{ "aria-label": "Frameworks, Spanish labels" }}
            placeholder="Selecciona"
            removeLabel={(label) => `Quitar ${label}`}
            value={TWO}
          />
        </Field>
      </State>

      <State
        breaks="Spacing written with physical left and right. The clear-all button uses logical end positioning and flips; the input's leading margin and the token padding use physical ml and pl, so spacing is slightly uneven in RTL."
        id="rtl"
        note="Worth checking by eye: the clear-all button should sit at the left edge, and tokens should start from the right."
        title="Right-to-left"
      >
        <div className="min-h-64 w-80 max-w-full" dir="rtl">
          <MultipleSelector
            defaultOptions={FRAMEWORKS}
            inputProps={{ "aria-label": "Frameworks, RTL" }}
            placeholder="اختر الأطر"
            value={TWO}
          />
        </div>
      </State>

      <State
        breaks="A keyboard path that needs the mouse for removal, or that traps focus in the list. Everything below works from the keyboard."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "Focuses the text input and opens the list." },
            { keys: "Arrow Down / Up", does: "Moves the highlight through the options (cmdk)." },
            {
              keys: "Enter",
              does: "Adds the highlighted option, or the Create row when creatable.",
            },
            {
              keys: "Backspace / Delete",
              does: "With the input empty, removes the last token that is not fixed.",
            },
            { keys: "Escape", does: "Blurs the input, which closes the list." },
          ]}
        >
          <Field>
            <MultipleSelector
              creatable
              defaultOptions={FRAMEWORKS}
              inputProps={{ "aria-label": "Frameworks, keyboard" }}
              placeholder="Try the keyboard"
            />
          </Field>
        </KeyboardPath>
      </State>

      <Aside title="Controlling the selection">
        <p>
          The component keeps its own selection and re-syncs from <code>value</code> whenever the
          array changes identity. Passing a new array literal on every render therefore resets the
          selection on each render: keep it in state and pass it back from{" "}
          <code>onValueChange</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
