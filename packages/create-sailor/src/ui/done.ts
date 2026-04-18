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

function useDecor(): boolean {
  return !process.env.NO_COLOR && !!process.stdout.isTTY;
}

export function showDone(opts: DoneOptions): void {
  const decor = useDecor();
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
    `     ${arrow} pnpm dev           ${decor ? pc.dim("→ http://localhost:3000") : "-> http://localhost:3000"}`,
    "",
    `   ${decor ? pc.bold("Customize:") : "Customize:"}`,
    `     ${arrow} pnpm sailor brand init   ${decor ? pc.dim("→ your colors, logo, domain") : "-> your colors, logo, domain"}`,
    `     ${arrow} pnpm sailor preset apply ${decor ? pc.dim("→ toggle features") : "-> toggle features"}`,
    `     ${arrow} pnpm sailor add <feat>   ${decor ? pc.dim("→ add queue/search/cache/...") : "-> add queue/search/cache/..."}`,
    "",
    `   ${decor ? pc.bold("Add more features later:") : "Add more features later:"}`,
    `     ${arrow} sailor add payment --provider=wechat`,
    `     ${arrow} sailor add email --provider=postmark`,
    `     ${arrow} sailor add storage --provider=supabase`,
    `     ${decor ? pc.dim("(more providers: `sailor add --list`)") : "(more providers: `sailor add --list`)"}`,
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
