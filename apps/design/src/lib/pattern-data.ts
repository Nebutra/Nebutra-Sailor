/**
 * The composition decisions, hand-written because they cannot be anything else.
 *
 * Everything else on this site is read from source. A pattern is the exception:
 * "reach for a Sheet, not a Dialog, once it scrolls" is a judgement somebody
 * made, and no amount of parsing recovers it. Writing it down is the whole job.
 *
 * What is *not* written down is whether the components each pattern names still
 * exist — that is checked against the barrels at build time (see `patterns.ts`).
 * The design-docs originals name eleven components that were removed with
 * @primer/react and never noticed. Keeping the cast as data is what lets the
 * page notice.
 */

export interface PatternRow {
  /** The thing being chosen — a component, a size, a state. */
  subject: string;
  use: string;
  not?: string;
}

export interface Pattern {
  slug: string;
  title: string;
  intro: string;
  /** Column headings for the decision table. */
  columns: readonly [string, string, string];
  rows: readonly PatternRow[];
  /** Every component the pattern names, verified at build time. */
  cast: readonly string[];
  /** Extra prose under the table, where the decision needs a reason. */
  note?: string;
}

export const PATTERNS: readonly Pattern[] = [
  {
    slug: "modality",
    title: "Modality",
    intro:
      "Four surfaces interrupt the page to different degrees. The specimens open, because the difference between a Sheet and a Dialog is one you settle by opening both rather than by reading about them.",
    columns: ["Surface", "Reach for it when", "Not when"],
    rows: [
      {
        subject: "Dialog",
        use: "A compact decision the user must make before continuing — confirm, discard, delete.",
        not: "Anything that scrolls. If it needs to scroll it is a Sheet.",
      },
      {
        subject: "Sheet",
        use: "A form or detail panel that slides in from an edge and may scroll.",
        not: "A one-line confirmation, which a Dialog states more directly.",
      },
      {
        subject: "Drawer",
        use: "An edge-attached, draggable surface — the phone-first sibling of Sheet.",
        not: "Desktop-primary flows, where a Sheet reads as intentional and a Drawer as mobile.",
      },
      {
        subject: "Popover",
        use: "Contextual detail anchored to its trigger, without blocking the page.",
        not: "Anything the user must answer. A non-blocking surface cannot demand a response.",
      },
    ],
    cast: ["Dialog", "Sheet", "Drawer", "Popover", "Flash", "IconButton", "TextInput"],
    note: "A destructive dialog whose confirm button is live the moment it opens has not actually asked anything. The specimen gates on typing the project name for that reason.",
  },
  {
    slug: "empty-states",
    title: "Empty, loading, failed",
    intro:
      "Three states every data surface has and most surfaces ship two of. They are separate components rather than one component with a status prop, because the copy, the affordance and the recovery path differ in each.",
    columns: ["State", "Render it when", "Not when"],
    rows: [
      {
        subject: "EmptyState",
        use: "The query succeeded and returned nothing. Carries the action that would create the first item.",
        not: "The request failed — that is ErrorState, and calling it empty hides an outage.",
      },
      {
        subject: "LoadingState",
        use: "A request is in flight and you have no shape to show yet.",
        not: "You know the shape. A Skeleton in the real layout reads faster and does not shift.",
      },
      {
        subject: "ErrorState",
        use: "The request threw. Carries a retry and, where there is one, an error id to quote.",
        not: "A validation failure, which belongs beside the field that caused it.",
      },
      {
        subject: "Skeleton",
        use: "The layout is known and only the values are pending.",
        not: "The count is unknown — a skeleton implying six rows when one arrives is a lie about the data.",
      },
    ],
    cast: ["EmptyState", "LoadingState", "ErrorState", "Skeleton", "DataTable"],
    note: "The three states are the most-skipped part of any table, and the one users hit first on a slow connection or a bad day.",
  },
  {
    slug: "forms",
    title: "Forms",
    intro:
      "Which control fits which shape of answer. The list is short on purpose: a form built from four controls the user already recognises beats one built from nine they have to learn.",
    columns: ["Answer shape", "Control", "Not"],
    rows: [
      { subject: "One line of text", use: "Input", not: "A Textarea sized to one row." },
      { subject: "Several lines", use: "Textarea", not: "An Input that scrolls horizontally." },
      {
        subject: "One of a few",
        use: "RadioGroup — every option visible.",
        not: "A Select, which hides options behind a click for no gain under about six.",
      },
      {
        subject: "One of many",
        use: "Select, or Combobox once the list needs searching.",
        not: "A RadioGroup, which becomes a wall past about six options.",
      },
      {
        subject: "On or off",
        use: "Checkbox in a form, Toggle for a setting that applies immediately.",
        not: "Switch — that is a segmented selector here, not a boolean.",
      },
      {
        subject: "Several of many",
        use: "MultipleSelector, which keeps the chosen set visible as tags.",
        not: "A long column of checkboxes the user has to scroll to audit.",
      },
    ],
    cast: [
      "Input",
      "Textarea",
      "RadioGroup",
      "Select",
      "Combobox",
      "Checkbox",
      "Toggle",
      "Switch",
      "MultipleSelector",
      "Field",
      "DatePicker",
    ],
    note: "Field owns the label, description and error slots. A form that lays those out per call site is how two rows in the same form end up with different spacing.",
  },
  {
    slug: "tables",
    title: "Tables",
    intro:
      "Two APIs, and the choice is about who owns the markup. Most tables in this product are the first kind and should stay that way.",
    columns: ["Need", "Use", "Cost"],
    rows: [
      {
        subject: "Static or simple lists",
        use: "The Table primitive — you write the header and body, it owns the type scale, alignment and density.",
        not: "Nothing to configure and nothing to learn.",
      },
      {
        subject: "Sorting, filtering, virtualisation, column visibility",
        use: "A data-table pattern over TanStack Table.",
        not: "A column definition API to learn, and a dependency that pulls its own weight only past a few hundred rows.",
      },
    ],
    cast: ["Table", "DataTable", "EmptyState", "LoadingState", "ErrorState", "DropdownMenu"],
    note: "Numeric columns take the numeric prop on both the head and the cell — that is what right-aligns them and switches to tabular figures, so a total can be scanned down the column.",
  },
  {
    slug: "navigation",
    title: "Navigation",
    intro:
      "Which control expresses which relationship. Getting this wrong is how a product ends up with tabs that navigate and breadcrumbs that filter.",
    columns: ["Relationship", "Control", "Not"],
    rows: [
      {
        subject: "Top-level, always present",
        use: "Header — the global bar.",
        not: "Tabs, which imply peers within one resource.",
      },
      {
        subject: "Section-level, within an area",
        use: "Sidebar — settings, admin, docs.",
        not: "A Header that grows a second row.",
      },
      {
        subject: "Peer views of one resource",
        use: "Tabs — overview, activity, settings for the same project.",
        not: "Sidebar entries, which imply separate areas rather than views.",
      },
      {
        subject: "Position in a hierarchy",
        use: "A breadcrumb trail.",
        not: "Tabs, which have no parent-child meaning.",
      },
      {
        subject: "Sibling pages in a sequence",
        use: "Pagination.",
        not: "Infinite scroll where a user needs to return to a position.",
      },
      {
        subject: "Nested items",
        use: "TreeView — files, org units.",
        not: "A flattened list that loses the nesting the user is reasoning about.",
      },
    ],
    cast: [
      "Header",
      "Sidebar",
      "Tabs",
      "Pagination",
      "TreeView",
      "NavList",
      "UnderlineNav",
      "Breadcrumbs",
    ],
  },
  {
    slug: "layout",
    title: "Layout",
    intro:
      "Three container widths, not six. The widths below are the ones the tokens declare; anything else is an arbitrary max-width and reads as one when two sections disagree by 40px.",
    columns: ["Width", "Use", "Not"],
    rows: [
      {
        subject: "--container-text",
        use: "Reading-first content — hero copy, FAQ, prose. Sized for line length rather than for the screen.",
        not: "A dashboard, which needs the room.",
      },
      {
        subject: "--container-content",
        use: "Pricing, architecture, blog — structured content that is still read top to bottom.",
        not: "A feature bento, which is looked at rather than read.",
      },
      {
        subject: "--container-wide",
        use: "Feature grids, testimonials, product demos, the navbar. 1400px.",
        not: "Body copy, which becomes unreadable at that measure.",
      },
    ],
    cast: ["Container", "Section", "PageHeader", "Card"],
    note: "max-w-5xl and max-w-7xl are the two values that keep reappearing in review. Neither is a token, and a page built from both is misaligned by a margin nobody can name.",
  },
  {
    slug: "charts",
    title: "Charts",
    intro:
      "The chart primitives wrap Recharts and take their colour, grid and tooltip styling from the tokens, so a chart re-skins with the rest of the product when the design language changes.",
    columns: ["Piece", "What it owns", "Note"],
    rows: [
      {
        subject: "ChartContainer",
        use: "Responsive sizing and the token-derived colour set every series reads from.",
        not: "Wrap every chart in it — a Recharts component rendered bare gets Recharts' defaults, not ours.",
      },
      {
        subject: "ChartTooltip",
        use: "The hover readout, matched to the popover surface.",
        not: "Recharts' own Tooltip, which brings its own white box and its own type scale.",
      },
      {
        subject: "ChartLegend",
        use: "The series key, using the same swatches as the plot.",
        not: "A hand-built legend, which is how a swatch ends up disagreeing with its line.",
      },
    ],
    cast: ["ChartContainer", "ChartTooltip", "ChartLegend"],
    note: "Live chart demos — bar, line, gauge, calendar — are on the Showcase, which renders the docs-shared set directly.",
  },
];

export const PATTERNS_BY_SLUG = new Map(PATTERNS.map((pattern) => [pattern.slug, pattern]));
