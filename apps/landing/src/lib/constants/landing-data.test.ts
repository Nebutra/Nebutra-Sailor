import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import fr from "../../../messages/fr.json";
import ja from "../../../messages/ja.json";
import ko from "../../../messages/ko.json";
import zh from "../../../messages/zh.json";
import { type FileNode, TREE_DATA } from "./landing-data";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

type FlattenedNode = {
  breadcrumb: string[];
  node: FileNode;
};

function flattenTree(nodes: FileNode[], trail: string[] = []): FlattenedNode[] {
  return nodes.flatMap((node) => {
    const breadcrumb = [...trail, node.label];
    return [{ breadcrumb, node }, ...flattenTree(node.children ?? [], breadcrumb)];
  });
}

describe("landing monorepo tree data", () => {
  it("uses the current top-level workspace layout", () => {
    expect(TREE_DATA.map((node) => node.label)).toEqual([
      "apps",
      "backends",
      "packages",
      "tooling",
    ]);

    const labels = flattenTree(TREE_DATA).map(({ node }) => node.label);
    expect(labels).toContain("ai");
    expect(labels).toContain("platform");
    expect(labels).toContain("db");
    expect(labels).toContain("gateway");
    expect(labels).not.toContain("ai-sdk");
    expect(labels).not.toContain("database");
    expect(labels).not.toContain("api-gateway");
  });

  it("points every displayed non-virtual node at a real repo path", () => {
    for (const { breadcrumb, node } of flattenTree(TREE_DATA)) {
      if (node.id === "tooling") {
        continue;
      }

      expect(node.path, breadcrumb.join(" / ")).toBeTruthy();
      expect(existsSync(path.join(repoRoot, node.path ?? "")), breadcrumb.join(" / ")).toBe(true);
    }
  });

  it("keeps displayed count tags aligned with the visible tree", () => {
    const topLevelByLabel = new Map(TREE_DATA.map((node) => [node.label, node]));
    expect(topLevelByLabel.get("apps")?.tag).toBe(
      String(topLevelByLabel.get("apps")?.children?.length),
    );
    expect(topLevelByLabel.get("backends")?.tag).toBe(
      String(topLevelByLabel.get("backends")?.children?.length),
    );

    const packages = topLevelByLabel.get("packages");
    const packageLeafCount = packages?.children?.reduce(
      (total, group) => total + (group.children?.length ?? 0),
      0,
    );
    expect(packages?.tag).toBe(String(packageLeafCount));

    for (const group of packages?.children ?? []) {
      expect(group.tag, group.label).toBe(String(group.children?.length ?? 0));
    }
  });
});

describe("landing monorepo count copy", () => {
  const locales = [
    ["de", de],
    ["en", en],
    ["es", es],
    ["fr", fr],
    ["ja", ja],
    ["ko", ko],
    ["zh", zh],
  ] as const;

  it("uses the current packages count across localized landing copy", () => {
    const packages = TREE_DATA.find((node) => node.label === "packages");
    const packageLeafCount = String(
      packages?.children?.reduce((total, group) => total + (group.children?.length ?? 0), 0) ?? 0,
    );

    for (const [locale, messages] of locales) {
      expect(messages.monorepoTree.title, locale).toContain(packageLeafCount);
      expect(messages.monorepoTree.title, locale).not.toContain("55");
      expect(messages.landing.socialProof.metrics.projects.value, locale).toBe(packageLeafCount);
    }
  });
});
