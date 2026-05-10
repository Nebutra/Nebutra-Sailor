/**
 * Layout Primitives
 *
 * Core layout utilities and patterns.
 */

import type { CSSProperties } from "react";

type StyleObject = Record<string, string | number | CSSProperties | (string | number)[]>;

/**
 * Common flex layouts
 */
export const flexLayouts = {
  row: {
    display: "flex",
    flexDirection: "row",
  },
  rowCenter: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  column: {
    display: "flex",
    flexDirection: "column",
  },
  columnCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
} as const satisfies Record<string, StyleObject>;

/**
 * Grid layout helpers
 */
export const gridLayouts = {
  auto: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 3,
  },
  two: {
    display: "grid",
    gridTemplateColumns: ["1fr", "1fr 1fr"],
    gap: 3,
  },
  three: {
    display: "grid",
    gridTemplateColumns: ["1fr", "1fr 1fr", "1fr 1fr 1fr"],
    gap: 3,
  },
  four: {
    display: "grid",
    gridTemplateColumns: ["1fr", "1fr 1fr", "1fr 1fr 1fr 1fr"],
    gap: 3,
  },
} as const satisfies Record<string, StyleObject>;

/**
 * Container max-widths (matches Primer breakpoints)
 */
export const containerWidths = {
  sm: 544,
  md: 768,
  lg: 1012,
  xl: 1280,
} as const;

/**
 * Z-index scale for layering
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;
