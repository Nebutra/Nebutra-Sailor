/**
 * The chart-library comparison on /benchmark (research/benchmark-plan.md). The KCQ fork's
 * bench/compare.mjs writes one raw report per run: every frame, every round. That file is published
 * unchanged under public/benchmark/; the page reads compare-run.json, the summary
 * summarizeCompareRun() derives from it. compare-run.test.ts proves the committed summary is exactly
 * that derivation, so the page can never show a number the downloadable file does not contain.
 *
 * New run: copy bench/results/compare-local.{json,csv} to public/benchmark/ under a new date, point
 * COMPARE_RUN_FILES at them, then from apps/kcq regenerate the summary:
 *   ../../node_modules/.bin/tsx -e 'import { readFileSync, writeFileSync } from "node:fs";
 *     import { summarizeCompareRun, COMPARE_RUN_FILES } from "./src/public/benchmark/compare-run.ts";
 *     const raw = JSON.parse(readFileSync("public" + COMPARE_RUN_FILES.json, "utf8"));
 *     writeFileSync("src/public/benchmark/compare-run.json", JSON.stringify(summarizeCompareRun(raw), null, 2) + "\n");'
 */
import summary from "./compare-run.json";

/** The published raw report and its CSV, static files beside the page (nginx `location /`). */
export const COMPARE_RUN_FILES = {
  json: "/benchmark/kcq-compare-2026-10-26.json",
  csv: "/benchmark/kcq-compare-2026-10-26.csv",
} as const;

/** The package bench/compare.mjs reports for every KCQ backend. */
export const KCQ_PACKAGE = "@363045841yyt/klinechart-core";

export interface CompareSubject {
  id: string;
  library: string;
  packageName: string;
  renderer: string;
}

/** One library at one visible-bar tier and moving-average count, aggregated over every round. */
export interface CompareScenario {
  subject: string;
  visibleBars: number;
  /** Moving-average lines drawn over the candles: the indicator load of the scene. */
  maLines: number;
  actualVisibleBars: number;
  /** Chrome TaskDuration over the measured frames: script, style, layout and GC. The comparable figure. */
  mainThreadMsPerFrame: number;
  /** The same figure per round: the spread between rounds is this machine's noise. */
  mainThreadMsPerFrameRounds: number[];
  /** Timed inside the page; misses work a library defers past its animation frame. */
  frameWorkP50Ms: number;
  frameWorkP99Ms: number;
  droppedFrameRate: number;
}

export interface CompareRun {
  generatedAt: string;
  commit: string;
  /** True when the measured code was `commit` plus uncommitted changes. */
  dirty: boolean;
  environment: { cpu: string; memoryGiB: number; os: string; browser: string; gpu: string };
  configuration: {
    width: number;
    height: number;
    dpr: number;
    warmupFrames: number;
    sampleFrames: number;
    rounds: number;
    visibleBars: number[];
    maLines: number[];
    refreshIntervalMs: number;
  };
  /** Package name to version; KCQ is the workspace source at `commit`. */
  libraries: Record<string, string>;
  subjects: CompareSubject[];
  scenarios: CompareScenario[];
}

/** The fields of the raw report the summary reads; everything else stays in the download. */
export interface RawCompareRun {
  generatedAt: string;
  git: { commit: string; dirty: boolean };
  environment: {
    cpu: string;
    memoryGiB: number;
    os: string;
    browserVersion: { product: string };
    pageGpu: { webglRenderer: string };
  };
  configuration: CompareRun["configuration"];
  libraries: Record<string, string>;
  subjects: CompareSubject[];
  scenarios: CompareScenario[];
}

/** The page's view of a raw report: environment in words, per-scenario aggregates, no frame arrays. */
export function summarizeCompareRun(raw: RawCompareRun): CompareRun {
  const { configuration, environment } = raw;
  return {
    generatedAt: raw.generatedAt,
    commit: raw.git.commit,
    dirty: raw.git.dirty,
    environment: {
      cpu: environment.cpu,
      memoryGiB: environment.memoryGiB,
      os: environment.os,
      // "Chrome/155.0.8059.85" as it reads in prose.
      browser: environment.browserVersion.product.replace("/", " "),
      gpu: environment.pageGpu.webglRenderer,
    },
    configuration: {
      width: configuration.width,
      height: configuration.height,
      dpr: configuration.dpr,
      warmupFrames: configuration.warmupFrames,
      sampleFrames: configuration.sampleFrames,
      rounds: configuration.rounds,
      visibleBars: configuration.visibleBars,
      maLines: configuration.maLines,
      refreshIntervalMs: configuration.refreshIntervalMs,
    },
    libraries: raw.libraries,
    subjects: raw.subjects.map(({ id, library, packageName, renderer }) => ({ id, library, packageName, renderer })),
    scenarios: raw.scenarios.map((scenario) => ({
      subject: scenario.subject,
      visibleBars: scenario.visibleBars,
      maLines: scenario.maLines,
      actualVisibleBars: scenario.actualVisibleBars,
      mainThreadMsPerFrame: scenario.mainThreadMsPerFrame,
      mainThreadMsPerFrameRounds: scenario.mainThreadMsPerFrameRounds,
      frameWorkP50Ms: scenario.frameWorkP50Ms,
      frameWorkP99Ms: scenario.frameWorkP99Ms,
      droppedFrameRate: scenario.droppedFrameRate,
    })),
  };
}

export const COMPARE_RUN: CompareRun = summary;

export interface CompareRow {
  subject: CompareSubject;
  scenario: CompareScenario;
  kcq: boolean;
}

function subjectOf(run: CompareRun, id: string): CompareSubject {
  const subject = run.subjects.find((candidate) => candidate.id === id);
  if (!subject) throw new Error(`Benchmark scenario names an unknown subject: ${id}`);
  return subject;
}

/** Every library at one visible-bar tier and moving-average count, least main-thread time first. */
export function tierRows(run: CompareRun, visibleBars: number, maLines: number): CompareRow[] {
  return run.scenarios
    .filter((scenario) => scenario.visibleBars === visibleBars && scenario.maLines === maLines)
    .map((scenario) => {
      const subject = subjectOf(run, scenario.subject);
      return { subject, scenario, kcq: subject.packageName === KCQ_PACKAGE };
    })
    .sort((a, b) => a.scenario.mainThreadMsPerFrame - b.scenario.mainThreadMsPerFrame);
}

/** The fastest and slowest round of a scenario. */
export function roundRange(scenario: CompareScenario): { low: number; high: number } {
  return {
    low: Math.min(...scenario.mainThreadMsPerFrameRounds),
    high: Math.max(...scenario.mainThreadMsPerFrameRounds),
  };
}

/** Whole-millisecond ticks from 0 past the run's slowest round, shared by every tier. */
export function axisTicks(run: CompareRun): number[] {
  const top = Math.ceil(Math.max(...run.scenarios.map((scenario) => roundRange(scenario).high)));
  return Array.from({ length: top + 1 }, (_, index) => index);
}

/**
 * The figures the page sells with, all from the run, in the heaviest scene (most bars, most moving
 * averages): KCQ's best backend there (the hero's number and its share of one frame), the heaviest
 * competitor there as a multiple of it, how much KCQ's best frame cost grows from the fewest bars to
 * the most, and how much it and that competitor grow from the fewest moving averages to the most.
 */
export function highlights(run: CompareRun) {
  const { visibleBars, maLines } = run.configuration;
  const bestAt = (bars: number, lines: number) => {
    const row = tierRows(run, bars, lines).find((candidate) => candidate.kcq);
    if (!row) throw new Error(`The comparison run has no KCQ scenario at ${bars} bars, ${lines} lines`);
    return row;
  };
  const bars = Math.max(...visibleBars);
  const lines = Math.max(...maLines);
  const fewestBars = Math.min(...visibleBars);
  const fewestLines = Math.min(...maLines);
  const best = bestAt(bars, lines);
  const heaviest = tierRows(run, bars, lines).at(-1);
  if (!heaviest || heaviest.kcq) throw new Error("The comparison run has no competitor heavier than KCQ");
  const heaviestFewer = tierRows(run, bars, fewestLines).find((row) => row.subject.id === heaviest.subject.id);
  if (!heaviestFewer) throw new Error(`The comparison run has no ${heaviest.subject.id} scenario at ${fewestLines} lines`);
  const ms = best.scenario.mainThreadMsPerFrame;
  const sparse = bestAt(fewestBars, lines).scenario;
  const lighter = bestAt(bars, fewestLines).scenario;
  return {
    bars,
    lines,
    best,
    heaviest,
    ratio: heaviest.scenario.mainThreadMsPerFrame / ms,
    // "Under N%": the next whole percent above the measured share, so the claim always holds.
    share: Math.floor((ms / run.configuration.refreshIntervalMs) * 100) + 1,
    growth: { from: sparse.actualVisibleBars, to: best.scenario.actualVisibleBars, rate: ms / sparse.mainThreadMsPerFrame - 1 },
    indicators: {
      from: fewestLines,
      to: lines,
      rate: ms / lighter.mainThreadMsPerFrame - 1,
      heaviestRate: heaviest.scenario.mainThreadMsPerFrame / heaviestFewer.scenario.mainThreadMsPerFrame - 1,
    },
  };
}
