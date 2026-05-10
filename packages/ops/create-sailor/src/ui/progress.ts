import pc from "picocolors";

export interface ProgressStep {
  index: number;
  total: number;
  label: string;
  value: string;
}

function useDecor(): boolean {
  return !process.env.NO_COLOR && !!process.stdout.isTTY;
}

/**
 * Render a single progress line: `[n/total] Label  ▸ value`.
 * Immutable — returns the formatted string (and prints if write=true).
 */
export function renderProgressLine(step: ProgressStep): string {
  const sep = useDecor() ? "▸" : "->";
  const head = `[${step.index}/${step.total}]`;
  const label = step.label.padEnd(18, " ");
  if (useDecor()) {
    return `${pc.dim(head)} ${pc.bold(label)} ${pc.dim(sep)} ${pc.cyan(step.value)}`;
  }
  return `${head} ${label} ${sep} ${step.value}`;
}

export function printProgressLine(step: ProgressStep): void {
  process.stdout.write(renderProgressLine(step) + "\n");
}

export class ProgressTracker {
  private readonly total: number;
  private readonly lines: readonly string[];

  constructor(total: number, lines: readonly string[] = []) {
    this.total = total;
    this.lines = lines;
  }

  step(index: number, label: string, value: string): ProgressTracker {
    const line = renderProgressLine({ index, total: this.total, label, value });
    process.stdout.write(line + "\n");
    return new ProgressTracker(this.total, [...this.lines, line]);
  }
}
