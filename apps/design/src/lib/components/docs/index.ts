/**
 * Components that have a live playground and a states matrix.
 *
 * Each slug here has a sibling `<slug>.tsx` client module exporting
 * `Playground` and `StatesMatrix`. The list is plain data so the server page
 * can decide whether to load the module without importing client code.
 */
export const LIVE_DOCS: ReadonlySet<string> = new Set([
  "button",
  "input",
  "select",
  "dialog",
  "table",
  "toast",
]);
