"use client";

import * as React from "react";

/**
 * Every string @nebutra/ui renders on its own, with the English defaults.
 *
 * A shared component cannot own a product's message catalog, so it used to
 * take a `labels` prop per component and fall back to English — and almost no
 * caller passed one, so a Japanese page got an English colour picker. The
 * contract now has three layers, later wins:
 *
 *   DEFAULT_UI_LABELS (English, here)
 *   ← <UiLabelsProvider labels={…}>  the app's translations, once at the root
 *   ← a component's own `labels` prop (one-off overrides)
 *
 * The translations live in a catalog like any other UI copy:
 * packages/platform/i18n/ui-labels/<locale>.json, loaded with
 * `loadUiLabels(locale)` from @nebutra/i18n/ui-labels, filled by the
 * translation workflow. Its en.json must equal DEFAULT_UI_LABELS — the
 * architecture tests compare them — so this file stays the English source.
 *
 * Templates use ICU-style `{name}` placeholders; format with `formatLabel`.
 */

export interface ColorPickerLabels {
  area: string;
  saturation: string;
  brightness: string;
  hue: string;
  alpha: string;
  input: string;
  invalid: string;
  eyeDropper: string;
  format: string;
  swatches: string;
  trigger: string;
}

export interface ThemeToggleLabels {
  /** Announced while the control is in dark mode. */
  light: string;
  /** Announced while the control is in light mode. */
  dark: string;
}

export interface GithubInlineDiffLabels {
  /** `{fileName}` = the diffed file. A function override is still accepted. */
  diff: string | ((fileName: string) => string);
  addComment: string;
  closeThread: string;
}

/** Every visible and accessible string the prompt box renders. */
export interface PromptInputBoxLabels {
  upload: string;
  search: string;
  think: string;
  canvas: string;
  searchPlaceholder: string;
  thinkPlaceholder: string;
  canvasPlaceholder: string;
  stopGeneration: string;
  stopRecording: string;
  sendMessage: string;
  voiceMessage: string;
}

export interface DataTableLabels {
  allFields: string;
  cellCopyError: string;
  cellCopySuccess: string;
  clearFilters: string;
  clearSelection: string;
  columns: string;
  /** `{count}` = visible column count. */
  columnSummary: string;
  copyCellTooltip: string;
  copyError: string;
  copySuccess: string;
  copyUnavailable: string;
  copyView: string;
  coreFields: string;
  /** `{title}` = the filter's column title. */
  filterPlaceholder: string;
  /** `{count}` = copied cell count. */
  multiCellCopySuccess: string;
  noMatches: string;
  pinLeft: string;
  pinRight: string;
  resizeColumn: string;
  presets: string;
  selectAll: string;
  /** `{visible}` / `{total}` = row counts. */
  summary: string;
  tip: string;
}

/** Strings several primitives share. */
export interface CommonLabels {
  close: string;
  previousSlide: string;
  nextSlide: string;
  more: string;
  loadingAvatar: string;
}

export interface UiLabels {
  common: CommonLabels;
  colorPicker: ColorPickerLabels;
  themeToggle: ThemeToggleLabels;
  githubInlineDiff: GithubInlineDiffLabels;
  promptInput: PromptInputBoxLabels;
  dataTable: DataTableLabels;
}

/** What a catalog supplies: any subset of any section, all strings. */
export type UiLabelMessages = {
  [K in keyof UiLabels]?: Partial<Record<keyof UiLabels[K], string>>;
};

export const DEFAULT_UI_LABELS = {
  common: {
    close: "Close",
    previousSlide: "Previous slide",
    nextSlide: "Next slide",
    more: "More",
    loadingAvatar: "Loading avatar",
  },
  colorPicker: {
    area: "Saturation and brightness",
    saturation: "Saturation",
    brightness: "Brightness",
    hue: "Hue",
    alpha: "Opacity",
    input: "Colour value",
    invalid: "Not a valid colour",
    eyeDropper: "Pick a colour from the screen",
    format: "Colour format",
    swatches: "Preset colours",
    trigger: "Pick a colour",
  },
  themeToggle: {
    light: "Switch to light theme",
    dark: "Switch to dark theme",
  },
  githubInlineDiff: {
    diff: "Diff of {fileName}",
    addComment: "Add inline comment",
    closeThread: "Close thread",
  },
  promptInput: {
    upload: "Upload image",
    search: "Search",
    think: "Think",
    canvas: "Canvas",
    searchPlaceholder: "Search the web...",
    thinkPlaceholder: "Think deeply...",
    canvasPlaceholder: "Create on canvas...",
    stopGeneration: "Stop generation",
    stopRecording: "Stop recording",
    sendMessage: "Send message",
    voiceMessage: "Voice message",
  },
  dataTable: {
    allFields: "All fields",
    cellCopyError: "Couldn't copy the cell",
    cellCopySuccess: "Cell copied",
    clearFilters: "Clear filters",
    clearSelection: "Clear selection",
    columns: "Columns",
    columnSummary: "{count} columns",
    copyCellTooltip: "Click to copy",
    copyError: "Couldn't copy",
    copySuccess: "Copied",
    copyUnavailable: "Clipboard unavailable",
    copyView: "Copy view",
    coreFields: "Core fields",
    filterPlaceholder: "Filter {title}…",
    multiCellCopySuccess: "Copied {count} cells",
    noMatches: "No matches",
    pinLeft: "Pin left",
    pinRight: "Pin right",
    resizeColumn: "Resize column",
    presets: "Presets",
    selectAll: "Select all",
    summary: "{visible} of {total} rows",
    tip: "Drag across cells to select, then copy",
  },
} as const satisfies UiLabels;

const UiLabelsContext = React.createContext<UiLabelMessages | null>(null);

export interface UiLabelsProviderProps {
  /** The app's translations for this request's locale — any subset. */
  labels: UiLabelMessages | null | undefined;
  children: React.ReactNode;
}

/** Mount once near the root, fed from `loadUiLabels(locale)`. */
export function UiLabelsProvider({ labels, children }: UiLabelsProviderProps) {
  return <UiLabelsContext value={labels ?? null}>{children}</UiLabelsContext>;
}

function defined<T extends object>(value: Partial<T> | undefined): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<T>;
}

/** One component's labels: English ← provider ← the component's own prop. */
export function useUiLabels<K extends keyof UiLabels>(
  section: K,
  overrides?: Partial<UiLabels[K]>,
): UiLabels[K] {
  const context = React.use(UiLabelsContext);
  return React.useMemo(
    () => ({
      ...(DEFAULT_UI_LABELS[section] as UiLabels[K]),
      ...defined(context?.[section] as Partial<UiLabels[K]> | undefined),
      ...defined(overrides),
    }),
    [context, section, overrides],
  );
}

/** `formatLabel("{visible} of {total}", { visible: 3, total: 9 })` */
export function formatLabel(
  template: string,
  values: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** A label as a node, for components whose body is a single expression. */
export function UiLabelText<K extends keyof UiLabels>({
  section,
  name,
}: {
  section: K;
  name: keyof UiLabels[K] & string;
}) {
  const label = useUiLabels(section)[name];
  return <>{typeof label === "string" ? label : String(name)}</>;
}
