/**
 * Shared Types for Custom UI
 */

/**
 * Component source tracking for governance
 */
export type ComponentSource =
  | "custom" // Built in-house
  | "promoted" // Promoted from external library
  | "experimental"; // Still experimental, from external

/**
 * Component lifecycle status
 */
export type ComponentStatus =
  | "stable" // Production-ready
  | "beta" // Testing in limited contexts
  | "deprecated" // Scheduled for removal
  | "experimental"; // Not for production use

/**
 * Component metadata for registry
 */
export interface ComponentMeta {
  name: string;
  source: ComponentSource;
  status: ComponentStatus;
  version: string;
  promotedFrom?: string; // Original library if promoted
  deprecatedReason?: string;
  replacedBy?: string; // Replacement component if deprecated
  accessibilityLevel?: "A" | "AA" | "AAA";
  responsive?: boolean;
  themeable?: boolean;
}

/**
 * Widget data props pattern
 */
export interface WidgetProps<T = unknown> {
  data: T;
  loading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
}

/**
 * Layout slot pattern
 */
export interface LayoutSlots {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  main: React.ReactNode;
  footer?: React.ReactNode;
}
