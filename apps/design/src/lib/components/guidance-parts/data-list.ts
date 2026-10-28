export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "With onRowClick, each row takes focus in turn. Without it the rows are not focusable.",
    },
    {
      keys: ["Enter", "Space"],
      does: "On a focused row, calls onRowClick for it. The default action is prevented, so Space does not scroll the page. The same keys on a button or link inside a cell go to that control, not to the row.",
    },
  ],
  a11y: [
    {
      title: "Name the table",
      body: "label sets the accessible name of the table. Pass it whenever the page has more than one list.",
    },
    {
      title: "Loading is busy, not announced text",
      body: "While loading or refreshing the region sets aria-busy, and the skeleton rows are aria-hidden. Nothing is read out for them.",
    },
    {
      title: "Empty and error are live regions",
      body: "Both bodies are polite live regions, so a list that changes to empty or error after a fetch is announced.",
    },
    {
      title: "Clickable rows have no role",
      body: "A row with onRowClick is focusable and responds to Enter and Space, but it keeps its native row role on purpose: role=button on a tr would remove it from the table structure. Clicks and keys from a control inside a cell do not also activate the row. Put a real link in a cell for navigation.",
    },
  ],
  dos: [
    {
      title: "Pass the query error straight through",
      body: "error accepts null, false and an empty string as no error, so a string-or-null value from a query hook needs no conditional.",
      code: "<DataList error={query.error?.message ?? null} rows={rows} columns={columns} getRowKey={getRowKey} />",
    },
    {
      title: "Use isRefreshing for refetches",
      body: "Rows stay mounted and dim, so scroll position and focus survive. Reserve status loading for the first load.",
      code: "<DataList isRefreshing={query.isFetching} status={query.isPending ? 'loading' : undefined} ... />",
    },
    {
      title: "Raise minBodyRows for a tall empty state",
      body: "The reserved height is a floor. If the empty body grows past it, raise minBodyRows so empty and loading agree.",
      code: "<DataList minBodyRows={8} emptyAction={<Button>New</Button>} ... />",
    },
  ],
  donts: [
    {
      title: "Do not hand-roll a table per screen",
      body: "This is the shared surface for the loading, empty and error bodies. Copying a table rebuilds the layout jumps it removes.",
    },
    {
      title: "Do not pass an unstable getRowKey",
      body: "Keys must be stable per row. An index or a random value remounts rows and loses focus.",
    },
    {
      title: "Do not expect rows while the status is not idle",
      body: "rows is ignored while error, loading or empty applies, by design.",
    },
  ],
};
