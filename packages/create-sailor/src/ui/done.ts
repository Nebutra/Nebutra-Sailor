import pc from "picocolors";
import {
  describeStatus,
  formatStatusBadge,
  type PreviewSelection,
} from "../utils/package-status.js";

export interface DoneOptions {
  elapsedSec: number;
  targetDir: string;
  skippedInstall: boolean;
  previewSelections?: PreviewSelection[];
}

function shouldUseDecor(): boolean {
  return !process.env.NO_COLOR && !!process.stdout.isTTY;
}

export function showDone(opts: DoneOptions): void {
  const decor = shouldUseDecor();
  const anchor = decor ? "⚓" : "-";
  const arrow = decor ? "▸" : "->";
  const star = decor ? "★" : "*";
  const mail = decor ? "📧" : "*";

  const title = decor
    ? pc.bold(`${anchor}  Done in ${opts.elapsedSec}s · ${opts.targetDir}/`)
    : `${anchor} Done in ${opts.elapsedSec}s · ${opts.targetDir}/`;

  const lines: string[] = [
    "",
    `   ${title}`,
    "",
    `   ${decor ? pc.bold("Next:") : "Next:"}`,
    `     ${arrow} cd ${opts.targetDir}`,
  ];

  if (opts.skippedInstall) {
    lines.push(`     ${arrow} pnpm install       (if --no-install was set)`);
  }

  lines.push(
    `     ${arrow} fill in .env.local ${decor ? pc.dim("→ add provider keys before booting apps") : "-> add provider keys before booting apps"}`,
    `     ${arrow} pnpm db:migrate    ${decor ? pc.dim("→ sync Prisma schema") : "-> sync Prisma schema"}`,
    `     ${arrow} pnpm db:seed       ${decor ? pc.dim("→ load example tenants and records") : "-> load example tenants and records"}`,
    `     ${arrow} pnpm dev           ${decor ? pc.dim("→ http://localhost:3000") : "-> http://localhost:3000"}`,
    "",
    `   ${decor ? pc.bold("Customize:") : "Customize:"}`,
    `     ${arrow} pnpm brand:init    ${decor ? pc.dim("→ create brand.config.ts") : "-> create brand.config.ts"}`,
    `     ${arrow} pnpm brand:apply   ${decor ? pc.dim("→ propagate brand changes") : "-> propagate brand changes"}`,
    `     ${arrow} pnpm preset:env    ${decor ? pc.dim("→ review preset env requirements") : "-> review preset env requirements"}`,
    "",
    `   ${decor ? pc.bold("Useful scripts:") : "Useful scripts:"}`,
    `     ${arrow} pnpm infra:up      ${decor ? pc.dim("→ start local PostgreSQL/Redis/ClickHouse") : "-> start local PostgreSQL/Redis/ClickHouse"}`,
    `     ${arrow} pnpm generate:api-types ${decor ? pc.dim("→ refresh shared API client types") : "-> refresh shared API client types"}`,
    `     ${arrow} pnpm lint          ${decor ? pc.dim("→ quick repo sanity check") : "-> quick repo sanity check"}`,
  );

  // Preview-status providers: call them out so the user knows they
  // scaffolded stub-level packages and won't be surprised at runtime.
  const preview = opts.previewSelections ?? [];
  if (preview.length > 0) {
    const header = decor
      ? pc.bold(pc.yellow("⚠  Preview features selected:"))
      : "!! Preview features selected:";
    lines.push("", `   ${header}`);
    for (const sel of preview) {
      const badge = formatStatusBadge(sel.status);
      const line = `     ${arrow} ${sel.flag} (${sel.provider}) ${badge}`;
      lines.push(decor ? pc.yellow(line) : line);
    }
    lines.push(
      "",
      `     ${decor ? pc.dim(describeStatus("foundation")) : describeStatus("foundation")}`,
      `     ${decor ? pc.dim("You may need to contribute the provider integration yourself.") : "You may need to contribute the provider integration yourself."}`,
      `     ${decor ? pc.dim("See: https://github.com/Nebutra/Nebutra-Sailor/blob/main/docs/package-status.md") : "See: https://github.com/Nebutra/Nebutra-Sailor/blob/main/docs/package-status.md"}`,
    );
  }

  lines.push(
    "",
    `   ${decor ? pc.bold("Ship faster:") : "Ship faster:"}`,
    `     ${star} Star us       https://github.com/nebutra/nebutra-sailor`,
    `     ${mail} Free license https://nebutra.com/get-license`,
    "",
  );

  process.stdout.write(lines.join("\n") + "\n");
}
