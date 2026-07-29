import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Biome-format a file the build just generated.
 *
 * The point of formatting a generated artifact is that the committed copy
 * matches what `biome check` expects, so the lint job stays green and the file
 * does not show up as a diff every time someone rebuilds. That is a tidiness
 * concern, and tidiness must not be able to stop a deploy.
 *
 * It could. Every one of these generators ran biome through execFileSync, or
 * exited with its status — so when Biome refused to start, the build died with
 * it. That is not hypothetical: Vercel's build sandbox has no .gitignore, the
 * repo's biome.json sets vcs.useIgnoreFile, and Biome treats a missing ignore
 * file as a configuration error. Every landing deploy failed on
 * `biome format --write styles.css` after the token CSS had already been
 * generated correctly.
 *
 * So a failure here is a warning. The CSS is byte-identical apart from
 * whitespace, the build continues, and real formatting drift in a committed
 * artifact is still caught by the lint job — where a formatter is supposed to
 * be authoritative, and where Biome can actually run.
 */
export function formatGenerated(...paths) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
  const biomeBin = resolve(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "biome.cmd" : "biome",
  );
  const targets = paths.filter(Boolean);
  if (targets.length === 0 || !existsSync(biomeBin)) return false;

  const fmt = spawnSync(biomeBin, ["format", "--write", ...targets], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (fmt.status === 0) return true;

  const detail = (fmt.stderr || fmt.stdout || "").trim().split("\n").slice(0, 3).join(" ");
  process.stderr.write(
    `[format-generated] biome could not format ${targets.length} generated file(s); ` +
      `content is unaffected, continuing. ${detail}\n`,
  );
  return false;
}
