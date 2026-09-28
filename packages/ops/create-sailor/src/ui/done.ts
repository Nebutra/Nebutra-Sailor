import pc from "picocolors";

export interface DoneOptions {
  elapsedSec: number;
  targetDir: string;
  /** Package manager used for install (pnpm/npm/yarn/bun). */
  packageManager?: string;
  skippedInstall: boolean;
  /** When false, hide db:migrate / db:seed. Default true for backward compat. */
  hasDatabase?: boolean;
}

function shouldUseDecor(): boolean {
  return !process.env.NO_COLOR && !!process.stdout.isTTY;
}

/**
 * Golden-path completion screen.
 * Only the minimum steps to get a running app; advanced scripts live in docs.
 */
export function showDone(opts: DoneOptions): void {
  const decor = shouldUseDecor();
  const anchor = decor ? "⚓" : "-";
  const arrow = decor ? "▸" : "->";
  const pm = opts.packageManager ?? "pnpm";
  const hasDatabase = opts.hasDatabase !== false;

  const isCwd = opts.targetDir === "." || opts.targetDir === "./" || opts.targetDir === ".\\";
  const locationLabel = isCwd
    ? "."
    : opts.targetDir.endsWith("/")
      ? opts.targetDir
      : `${opts.targetDir}/`;

  const title = decor
    ? pc.bold(`${anchor}  Done in ${opts.elapsedSec}s · ${locationLabel}`)
    : `${anchor} Done in ${opts.elapsedSec}s · ${locationLabel}`;

  const dim = (s: string) => (decor ? pc.dim(s) : s);
  const bold = (s: string) => (decor ? pc.bold(s) : s);

  const lines: string[] = ["", `   ${title}`, "", `   ${bold("Next:")}`];

  if (!isCwd) {
    lines.push(`     ${arrow} cd ${opts.targetDir}`);
  }

  if (opts.skippedInstall) {
    lines.push(`     ${arrow} ${pm} install`);
  }

  lines.push(
    `     ${arrow} ${pm} dev          ${dim("→ http://localhost:3001/welcome — no keys, no Docker")}`,
  );

  if (hasDatabase) {
    lines.push(
      `     ${arrow} ${pm} db:migrate   ${dim("→ later, once DATABASE_URL points at your Postgres")}`,
    );
  }

  lines.push(
    "",
    `   ${dim("pnpm dev prints what is live and what needs a key.")} ${dim("More:")} ${dim(".sailor/next-steps.md")}`,
  );
  lines.push("");
  process.stdout.write(lines.join("\n") + "\n");
}
