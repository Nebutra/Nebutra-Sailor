import { Chip, Table, Td, Th, Tr } from "../app/(tokens)/tokens/_components/primitives";

/** One app's row in `adoption.json`, as `scripts/adoption.mjs` writes it. */
export interface AdoptionApp {
  name: string;
  status: string | null;
  graph: string | null;
  tsxFiles: number;
  uiFiles: number;
  uiRatio: number | null;
  hardcodedHex: number;
  arbitraryFontSizes: number;
}

export interface AdoptionTotals {
  apps: number;
  tsxFiles: number;
  uiFiles: number;
  uiRatio: number | null;
  hardcodedHex: number;
  arbitraryFontSizes: number;
}

/**
 * Where the bar changes tone. These are editorial bands, not a standard: they
 * exist so a reader can find the weak rows at a glance, and they are stated on
 * the page rather than implied by a colour.
 */
export const RATIO_BANDS = { strong: 0.6, partial: 0.3 } as const;

type Band = "strong" | "partial" | "weak" | "none";

export function bandOf(ratio: number | null): Band {
  if (ratio === null) return "none";
  if (ratio >= RATIO_BANDS.strong) return "strong";
  if (ratio >= RATIO_BANDS.partial) return "partial";
  return "weak";
}

const BAR_TONE: Record<Band, string> = {
  strong: "bg-success",
  partial: "bg-warning",
  weak: "bg-destructive",
  none: "bg-muted",
};

export const percent = (ratio: number | null) =>
  ratio === null ? "—" : `${Math.round(ratio * 100)}%`;

/** Highest adoption first; apps with no tsx last, then by name so ties are stable. */
export function byAdoption(apps: readonly AdoptionApp[]): AdoptionApp[] {
  return [...apps].sort((a, b) => {
    if (a.uiRatio === null && b.uiRatio === null) return a.name.localeCompare(b.name);
    if (a.uiRatio === null) return 1;
    if (b.uiRatio === null) return -1;
    return b.uiRatio - a.uiRatio || a.name.localeCompare(b.name);
  });
}

function RatioBar({ ratio }: { ratio: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted sm:w-40"
      >
        <div
          className={`h-full rounded-full ${BAR_TONE[bandOf(ratio)]}`}
          // The width is the measurement; it cannot be a class.
          style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }}
        />
      </div>
      <span className="w-10 text-end text-foreground text-sm tabular-nums">{percent(ratio)}</span>
    </div>
  );
}

/** A count that is zero reads as the good outcome it is, rather than as a gap. */
function Count({ value }: { value: number }) {
  return (
    <span className={value === 0 ? "text-muted-foreground" : "text-foreground"}>
      {value.toLocaleString("en-US")}
    </span>
  );
}

function AdoptionDesktopTable({
  apps,
  totals,
}: {
  apps: readonly AdoptionApp[];
  totals: AdoptionTotals;
}) {
  const rows = byAdoption(apps);

  return (
    <Table>
      <thead>
        <tr>
          <Th>App</Th>
          <Th>Status</Th>
          <Th className="text-end">.tsx files</Th>
          <Th className="text-end">Import @nebutra/ui</Th>
          <Th>Share of files</Th>
          <Th className="text-end">Hard-coded hex</Th>
          <Th className="text-end">Arbitrary sizes</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((app, index) => (
          <Tr index={index} key={app.name}>
            <Td className="font-medium text-foreground">{app.name}</Td>
            <Td>
              {app.status ? (
                <Chip title={`graph: ${app.graph ?? "none"}`}>{app.status}</Chip>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Td>
            <Td className="text-end tabular-nums">
              <Count value={app.tsxFiles} />
            </Td>
            <Td className="text-end tabular-nums">
              <Count value={app.uiFiles} />
            </Td>
            <Td>
              <RatioBar ratio={app.uiRatio} />
            </Td>
            <Td className="text-end tabular-nums">
              <Count value={app.hardcodedHex} />
            </Td>
            <Td className="text-end tabular-nums">
              <Count value={app.arbitraryFontSizes} />
            </Td>
          </Tr>
        ))}
        <tr className="border-border border-t-2">
          <Td className="py-3 font-medium text-foreground">All {totals.apps} apps</Td>
          <Td>{null}</Td>
          <Td className="text-end text-foreground tabular-nums">
            {totals.tsxFiles.toLocaleString("en-US")}
          </Td>
          <Td className="text-end text-foreground tabular-nums">
            {totals.uiFiles.toLocaleString("en-US")}
          </Td>
          <Td>
            <RatioBar ratio={totals.uiRatio} />
          </Td>
          <Td className="text-end text-foreground tabular-nums">
            {totals.hardcodedHex.toLocaleString("en-US")}
          </Td>
          <Td className="text-end text-foreground tabular-nums">
            {totals.arbitraryFontSizes.toLocaleString("en-US")}
          </Td>
        </tr>
      </tbody>
    </Table>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="m-0 text-sm tabular-nums">
        <Count value={value} />
      </dd>
    </div>
  );
}

/** The same rows as cards, for widths where seven columns cannot sit side by side. */
function AdoptionCards({ apps, totals }: { apps: readonly AdoptionApp[]; totals: AdoptionTotals }) {
  const card = (
    key: string,
    title: string,
    status: string | null,
    entry: AdoptionTotals | AdoptionApp,
  ) => (
    <li className="border-border border-b py-4 first:pt-0 last:border-b-0" key={key}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="m-0 flex items-baseline gap-2 font-medium text-foreground">
          {title}
          {status ? <Chip>{status}</Chip> : null}
        </p>
        <span className="text-foreground text-sm tabular-nums">{percent(entry.uiRatio)}</span>
      </div>
      <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${BAR_TONE[bandOf(entry.uiRatio)]}`}
          style={{ width: `${Math.round((entry.uiRatio ?? 0) * 100)}%` }}
        />
      </div>
      <dl className="m-0 mt-3 grid grid-cols-4 gap-3">
        <Stat label=".tsx" value={entry.tsxFiles} />
        <Stat label="@nebutra/ui" value={entry.uiFiles} />
        <Stat label="Hex" value={entry.hardcodedHex} />
        <Stat label="text-[ ]" value={entry.arbitraryFontSizes} />
      </dl>
    </li>
  );

  return (
    <ul className="m-0 list-none p-0">
      {byAdoption(apps).map((app) => card(app.name, app.name, app.status, app))}
      {card("total", `All ${totals.apps} apps`, null, totals)}
    </ul>
  );
}

export function AdoptionTable({
  apps,
  totals,
}: {
  apps: readonly AdoptionApp[];
  totals: AdoptionTotals;
}) {
  return (
    <>
      <div className="hidden md:block">
        <AdoptionDesktopTable apps={apps} totals={totals} />
      </div>
      <div className="md:hidden">
        <AdoptionCards apps={apps} totals={totals} />
      </div>
    </>
  );
}
