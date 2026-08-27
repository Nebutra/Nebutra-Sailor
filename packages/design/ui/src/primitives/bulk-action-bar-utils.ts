import type { BulkAction } from "./bulk-action-bar";

export function getBulkActionKey(action: BulkAction): string {
  return (
    action.id ??
    [
      action.label,
      action.variant ?? "secondary",
      action.minSelection ?? "min-any",
      action.maxSelection ?? "max-any",
    ].join(":")
  );
}
