"use client";

import * as React from "react";

/** Link between `HoverCard` and its content, for the one thing the content has to tell the root. */
interface HoverCardContextValue {
  /**
   * Called right before Base UI restores focus to the trigger after the card closes, so that the
   * restored focus does not count as keyboard focus and reopen the card.
   */
  suppressFocusOpen: () => void;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

export type { HoverCardContextValue };
export { HoverCardContext };
