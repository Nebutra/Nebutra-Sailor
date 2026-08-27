/**
 * Calendar Component Tokens — Layer 3
 *
 * The day grid is the one control whose geometry cannot be derived from the
 * form-row scale: a cell is square, so its width follows its height and the
 * popover width follows seven of them. Deriving both from one `cellSize` keeps
 * the grid from drifting when the row scale changes.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
} from "../primitive";

export const calendarTokens = {
  /** Square day cell. Matches the `sm` control height so a month reads as a form row grid. */
  cellSize: primitiveSizing.sm,
  cellRadius: primitiveRadius.md,
  cellFontSize: primitiveFontSize.sm,
  weekdayFontSize: primitiveFontSize.xs,
  captionFontSize: primitiveFontSize.sm,
  navButtonSize: primitiveSizing.tiny,
  navIconSize: primitiveFontSize.base,
  padding: primitiveSpacing[3],
  /** Gap between side-by-side months when `numberOfMonths > 1`. */
  monthGap: primitiveSpacing[4],
  captionGap: primitiveSpacing[2],
} as const;
