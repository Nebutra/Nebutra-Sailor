/**
 * Company Tower — public surface.
 *
 * The nine-floor "stratigraphy" view of a Startup OS project's company context
 * (L9 执行 crown at top -> L1 本质 engraved base at bottom). Render the whole
 * tower via `<CompanyTower context={...} />`; the inner floors / special bodies
 * (TowerFloor / BrandKitFloor / ControlDeck) and atoms (CompletenessRing /
 * FieldCard / provenance + status + stability chips) are composed internally but
 * re-exported here for tests and host integration.
 */

export { BrandKitFloor, type BrandKitFloorProps } from "./brand-kit-floor";
export { CompanyTower } from "./company-tower";
export { CompletenessRing, type CompletenessRingProps } from "./completeness-ring";
export { ControlDeck, type ControlDeckProps } from "./control-deck";
export { FieldCard, type FieldCardProps } from "./field-card";
export {
  ProvenanceBadge,
  type ProvenanceBadgeProps,
  StabilityBadge,
  type StabilityBadgeProps,
  StatusBadge,
  type StatusBadgeProps,
} from "./provenance-badge";
export { TowerFloor, type TowerFloorProps } from "./tower-floor";
export type {
  CompanyTowerProps,
  FieldAction,
  FieldActionHandlers,
  FieldFillCount,
} from "./types";
