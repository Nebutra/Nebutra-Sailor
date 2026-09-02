import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { readWorkspacePackages } from "../../scripts/lib/release-surface.mjs";

/**
 * pnpm creates the `node_modules/.bin` shims for workspace packages while it
 * links dependencies — before any `prepare` script or build has run — and it
 * reads the target file's shebang to do so. A `bin` that points into `dist/`
 * therefore warns `Failed to create bin … ENOENT` on every fresh install and
 * the command is never linked (closure-phase P0 item 4).
 *
 * The convention: `bin` points at a committed `bin/*.js` that exists at link
 * time, explains how to build when `dist/` is missing, and otherwise hands off
 * to the built entry with identical argv so published behavior is unchanged.
 */

const root = process.cwd();

/** What a fresh clone contains before anything is built. */
const trackedFiles = new Set(
  execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean),
);

interface WorkspaceBin {
  packageName: string;
  binName: string;
  /** The `bin` value exactly as written in package.json. */
  target: string;
  /** Target relative to the package directory, without a leading `./`. */
  packageRelativePath: string;
  /** Target relative to the repo root, in the form `git ls-files` prints. */
  repoPath: string;
  absolutePath: string;
  files: unknown;
  prepare: string;
}

function collectWorkspaceBins(): WorkspaceBin[] {
  const bins: WorkspaceBin[] = [];

  for (const entry of readWorkspacePackages(root)) {
    const { name, bin, files, scripts } = entry.manifest;
    // A string `bin` is published under the package's unscoped name.
    const table: Record<string, unknown> =
      typeof bin === "string" ? { [String(name).split("/").pop() ?? name]: bin } : (bin ?? {});

    for (const [binName, target] of Object.entries(table)) {
      if (typeof target !== "string") continue;
      const packageRelativePath = target.replace(/^\.\//, "");
      bins.push({
        packageName: name,
        binName,
        target,
        packageRelativePath,
        repoPath: path.posix.join(entry.relativeDir.split(path.sep).join("/"), packageRelativePath),
        absolutePath: path.join(entry.packageDir, packageRelativePath),
        files,
        prepare: String(scripts?.prepare ?? ""),
      });
    }
  }

  return bins;
}

const bins = collectWorkspaceBins();
const trackedBins = bins.filter((bin) => trackedFiles.has(bin.repoPath));

/** Tracked bins that follow the convention: a committed file forwarding to `../dist/…`. */
const stubs = trackedBins.flatMap((bin) => {
  const distTarget = readFileSync(bin.absolutePath, "utf8").match(
    /["'](\.\.\/dist\/[^"']+)["']/,
  )?.[1];
  return distTarget ? [{ ...bin, distTarget }] : [];
});

function includedByFiles(relativePath: string, files: unknown): boolean {
  // No `files` allowlist means the whole package directory is published.
  if (!Array.isArray(files) || files.length === 0) return true;

  return files.some((entry) => {
    const normalized = String(entry).replace(/^\.\//, "").replace(/\/$/, "");
    return relativePath === normalized || relativePath.startsWith(`${normalized}/`);
  });
}

describe("workspace package bins", () => {
  it("enumerates the CLI bins this repo ships", () => {
    expect(bins.map((bin) => bin.binName)).toEqual(
      expect.arrayContaining(["nebutra", "create-sailor", "nebutra-mcp", "nebutra-tool-protocol"]),
    );
  });

  it("points every bin at a file that exists in a fresh checkout", () => {
    const missing = bins
      .filter((bin) => !trackedFiles.has(bin.repoPath))
      .map(
        (bin) =>
          `${bin.packageName} bin "${bin.binName}" -> ${bin.target} is not tracked by git; ` +
          "pnpm links bins before any build or prepare script runs",
      );

    expect(missing).toEqual([]);
  });

  it("starts every bin with a node shebang so the install shim picks the interpreter", () => {
    const withoutShebang = trackedBins
      .filter((bin) => !readFileSync(bin.absolutePath, "utf8").startsWith("#!/usr/bin/env node\n"))
      .map((bin) => `${bin.packageName} bin ${bin.target}`);

    expect(withoutShebang).toEqual([]);
  });

  it("ships every dist-forwarding stub inside the package files allowlist", () => {
    // A stub that is not published next to dist/ leaves the npm tarball with a
    // bin pointing at nothing — the same failure this file exists to prevent.
    const excluded = stubs
      .filter((bin) => !includedByFiles(bin.packageRelativePath, bin.files))
      .map(
        (bin) =>
          `${bin.packageName} bin ${bin.target} is excluded by files=${JSON.stringify(bin.files)}`,
      );

    expect(excluded).toEqual([]);
  });

  it("does not paper over a missing build with prepare-time placeholders", () => {
    // A `prepare` script that writes a shebang-only file into dist/ runs after
    // bin linking, so it never removes the warning — and it makes an unbuilt
    // CLI exit 0 doing nothing instead of saying it has not been built.
    const placeholders = [
      ...new Set(
        bins
          .filter((bin) => bin.prepare.includes("dist/"))
          .map((bin) => `${bin.packageName} scripts.prepare writes into dist/: ${bin.prepare}`),
      ),
    ];

    expect(placeholders).toEqual([]);
  });
});

describe("dist-forwarding bin stubs", () => {
  const tempDirs: string[] = [];

  afterAll(() => {
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  });

  /** Copy one stub into a throwaway package so `../dist` resolves to a dir we control. */
  function stage(stub: (typeof stubs)[number]): { stubPath: string; distPath: string } {
    const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "workspace-bin-stub-")));
    tempDirs.push(dir);
    writeFileSync(path.join(dir, "package.json"), '{ "type": "module" }\n');
    mkdirSync(path.join(dir, "bin"));

    const stubPath = path.join(dir, "bin", path.basename(stub.absolutePath));
    copyFileSync(stub.absolutePath, stubPath);

    return { stubPath, distPath: path.resolve(dir, "bin", stub.distTarget) };
  }

  it("covers every CLI whose bin is built by tsup", () => {
    expect(stubs.map((stub) => stub.binName)).toEqual(
      expect.arrayContaining(["nebutra", "create-sailor", "nebutra-mcp", "nebutra-tool-protocol"]),
    );
  });

  it.each(
    stubs.map((stub) => [stub.binName, stub] as const),
  )("%s exits 1 with a build hint when dist/ is missing", (_binName, stub) => {
    const { stubPath } = stage(stub);

    const result = spawnSync(process.execPath, [stubPath, "--help"], { encoding: "utf8" });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(`pnpm --filter ${stub.packageName} build`);
  });

  it.each(
    stubs.map((stub) => [stub.binName, stub] as const),
  )("%s hands argv and the exit code to the built entry once it exists", (_binName, stub) => {
    const { stubPath, distPath } = stage(stub);
    mkdirSync(path.dirname(distPath), { recursive: true });
    writeFileSync(
      distPath,
      "process.stdout.write(JSON.stringify(process.argv.slice(1)));\nprocess.exit(7);\n",
    );

    const result = spawnSync(process.execPath, [stubPath, "alpha", "--beta=1"], {
      encoding: "utf8",
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(7);
    // argv[1] is the built entry, exactly as if it had been run directly.
    expect(JSON.parse(result.stdout)).toEqual([distPath, "alpha", "--beta=1"]);
  });
});
