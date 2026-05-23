import type { PackageFeatureEntry } from "../package-feature-data";
import { BusSpecimen } from "./BusSpecimen";
import { CorridorSpecimen } from "./CorridorSpecimen";
import { GatewayCorridorSpecimen } from "./GatewayCorridorSpecimen";
import { LedgerSpecimen } from "./LedgerSpecimen";
import { OrbitSpecimen } from "./OrbitSpecimen";
import { SpectrumSpecimen } from "./SpectrumSpecimen";
import { StackSpecimen } from "./StackSpecimen";
import { TapeSpecimen } from "./TapeSpecimen";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Dispatch to the right specimen idiom based on the entry's visualVariant.
 *
 * Every concrete specimen takes the same `{ entry, locale, compact? }`
 * contract, so the dispatch table stays trivially small.
 */
export function ArtifactSpecimen({ entry, locale, compact = false }: Props) {
  switch (entry.visualVariant) {
    case "orbit":
      return <OrbitSpecimen entry={entry} locale={locale} compact={compact} />;
    case "corridor":
      return <CorridorSpecimen entry={entry} locale={locale} compact={compact} />;
    case "bus":
      return <BusSpecimen entry={entry} locale={locale} compact={compact} />;
    case "stack":
      return <StackSpecimen entry={entry} locale={locale} compact={compact} />;
    case "spectrum":
      return <SpectrumSpecimen entry={entry} locale={locale} compact={compact} />;
    case "ledger":
      return <LedgerSpecimen entry={entry} locale={locale} compact={compact} />;
    case "gateway-corridor":
      return <GatewayCorridorSpecimen entry={entry} locale={locale} compact={compact} />;
    case "tape":
      return <TapeSpecimen entry={entry} locale={locale} compact={compact} />;
    default:
      return <StackSpecimen entry={entry} locale={locale} compact={compact} />;
  }
}
