/**
 * The Blocks tier: real product scenes assembled from Core components.
 *
 * Blocks are authored, not derived. Each one is a file in
 * `src/app/(showcase)/showcase/_blocks/`, and the code shown for it on the page
 * is that file, read at build time - so the example you copy is the example that
 * renders, not a second copy that can drift.
 *
 * `uses` names the catalog entry and the symbol the file imports. A test holds
 * both to the truth: the entry must exist in the catalog and the symbol must
 * appear in the source.
 */

export interface BlockUse {
  /** Catalog entry id. */
  id: string;
  /** The exported symbol the block imports. */
  name: string;
}

export interface BlockMeta {
  id: string;
  title: string;
  /** The Nebutra product the scene comes from. */
  product: string;
  /** One sentence: what the scene shows and the decision it encodes. */
  blurb: string;
  /** File name inside `_blocks/`. */
  file: string;
  uses: readonly BlockUse[];
}

export const BLOCKS_DIR = "src/app/(showcase)/showcase/_blocks";

export const BLOCKS: readonly BlockMeta[] = [
  {
    id: "router-revoke-key",
    title: "Revoke an API key",
    product: "Router",
    blurb:
      "A destructive action asks once, names the key and says what will break, then confirms with a toast.",
    file: "router-revoke-key.tsx",
    uses: [
      { id: "table", name: "Table" },
      { id: "badge", name: "Badge" },
      { id: "button", name: "Button" },
      { id: "confirm-dialog", name: "ConfirmDialog" },
      { id: "toaster", name: "toast" },
    ],
  },
  {
    id: "forge-deploy-list",
    title: "Deployment list",
    product: "Forge",
    blurb: "A state filter over rows where the dot and its label carry status, with a row menu.",
    file: "forge-deploy-list.tsx",
    uses: [
      { id: "filter-pills", name: "FilterPills" },
      { id: "status-dot", name: "StatusDot" },
      { id: "dropdown-menu", name: "DropdownMenu" },
      { id: "badge", name: "Badge" },
      { id: "button", name: "Button" },
      { id: "toaster", name: "toast" },
    ],
  },
  {
    id: "kcq-market-toolbar",
    title: "Market toolbar",
    product: "KCQ",
    blurb: "Market, symbol search, candle interval and feed state in one wrapping row.",
    file: "kcq-market-toolbar.tsx",
    uses: [
      { id: "select", name: "Select" },
      { id: "input", name: "Input" },
      { id: "kbd", name: "Kbd" },
      { id: "toggle-group", name: "ToggleGroup" },
      { id: "switch", name: "Switch" },
      { id: "tooltip", name: "Tooltip" },
      { id: "button", name: "Button" },
    ],
  },
  {
    id: "settings-form",
    title: "Settings page",
    product: "Platform",
    blurb:
      "One section per setting, each with its own Save that stays off until the value is changed and valid.",
    file: "settings-form.tsx",
    uses: [
      { id: "settings-section", name: "SettingsSection" },
      { id: "field", name: "Field" },
      { id: "input", name: "Input" },
      { id: "select", name: "Select" },
      { id: "checkbox", name: "Checkbox" },
      { id: "button", name: "Button" },
      { id: "toaster", name: "toast" },
    ],
  },
  {
    id: "result-states",
    title: "Empty, loading and failed",
    product: "Platform",
    blurb: "The three states a list has besides loaded, each with a way forward.",
    file: "result-states.tsx",
    uses: [
      { id: "empty-state", name: "EmptyState" },
      { id: "error-state", name: "ErrorState" },
      { id: "loading-state", name: "LoadingState" },
      { id: "skeleton", name: "Skeleton" },
      { id: "toggle-group", name: "ToggleGroup" },
      { id: "button", name: "Button" },
    ],
  },
  {
    id: "command-palette",
    title: "Command palette",
    product: "Platform",
    blurb: "Grouped commands with shortcut hints; filtering and keyboard movement are built in.",
    file: "command-palette.tsx",
    uses: [
      { id: "command", name: "Command" },
      { id: "kbd", name: "Kbd" },
    ],
  },
  {
    id: "toast-stack",
    title: "Toast stack",
    product: "Platform",
    blurb: "Success, warning, error with an action, and a promise toast that settles in place.",
    file: "toast-stack.tsx",
    uses: [
      { id: "toaster", name: "toast" },
      { id: "button", name: "Button" },
    ],
  },
  {
    id: "table-toolbar",
    title: "Data table toolbar",
    product: "Platform",
    blurb:
      "Search and filter pills until a row is selected; then the toolbar becomes the bulk actions.",
    file: "table-toolbar.tsx",
    uses: [
      { id: "input", name: "Input" },
      { id: "filter-pills", name: "FilterPills" },
      { id: "checkbox", name: "Checkbox" },
      { id: "table", name: "Table" },
      { id: "badge", name: "Badge" },
      { id: "button", name: "Button" },
    ],
  },
];
