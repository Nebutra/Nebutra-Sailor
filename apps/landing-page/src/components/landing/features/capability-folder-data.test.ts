import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type FileNode, TREE_DATA } from "@/lib/constants/landing-data";
import { CAPABILITY_FOLDERS } from "./capability-folder-data";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");

function flattenTree(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children ?? [])]);
}

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if ([".next", "dist", "node_modules"].includes(entry.name)) {
      return [];
    }

    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

function sourceStatsFor(sourcePath: string) {
  const files = collectFiles(path.join(repoRoot, sourcePath));
  const tsSourceFiles = files.filter(
    (file) => file.includes(`${path.sep}src${path.sep}`) && /\.[tj]sx?$/.test(file),
  );
  const testFiles = files.filter((file) => /\.(test|spec)\.[tj]sx?$/.test(file));

  return {
    readmes: files.filter((file) => path.basename(file) === "README.md").length,
    sourceFiles: tsSourceFiles.filter((file) => !/\.(test|spec)\.[tj]sx?$/.test(file)).length,
    testFiles: testFiles.length,
    unitCount: files.filter((file) => path.basename(file) === "package.json").length,
  };
}

describe("capability folder showcase data", () => {
  it("anchors every module to a real high-value source folder", () => {
    for (const folder of CAPABILITY_FOLDERS) {
      expect(folder.anchorId).toMatch(/^capability-[a-z-]+$/);
      expect(existsSync(path.join(repoRoot, folder.sourcePath)), folder.sourcePath).toBe(true);
      expect(folder.owns.length, folder.id).toBeGreaterThanOrEqual(3);
      expect(folder.boundaries.length, folder.id).toBeGreaterThanOrEqual(2);
      expect(folder.proof.length, folder.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps source metrics grounded in the current repository", () => {
    for (const folder of CAPABILITY_FOLDERS) {
      expect(sourceStatsFor(folder.sourcePath), folder.id).toEqual({
        readmes: folder.sourceStats.readmes,
        sourceFiles: folder.sourceStats.sourceFiles,
        testFiles: folder.sourceStats.testFiles,
        unitCount: folder.sourceStats.unitCount,
      });
    }
  });

  it("keeps landing tree jump links aligned with features page capability modules", () => {
    const featureAnchors = new Set(CAPABILITY_FOLDERS.map((folder) => folder.anchorId));
    const treeAnchors = flattenTree(TREE_DATA)
      .map((node) => node.featureAnchor)
      .filter((anchor): anchor is string => Boolean(anchor));

    expect(treeAnchors).toHaveLength(featureAnchors.size);

    for (const anchor of treeAnchors) {
      expect(featureAnchors.has(anchor), anchor).toBe(true);
    }
  });
});
