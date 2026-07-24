import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPackageFeatureEntry, toSerializablePackageFeatureEntry } from "./package-feature-data";

const featureDetailPageSource = readFileSync(
  path.join(process.cwd(), "src/app/[lang]/(marketing)/features/[name]/page.tsx"),
  "utf8",
);

describe("package feature data", () => {
  it("removes React nodes before entries cross a Client Component boundary", () => {
    const entry = getPackageFeatureEntry("integrations");

    expect(entry?.icon).toBeDefined();
    if (!entry) {
      throw new Error("Expected integrations feature entry to exist.");
    }

    const serializable = toSerializablePackageFeatureEntry(entry);

    expect(Object.hasOwn(serializable, "icon")).toBe(false);
    expect(serializable).toMatchObject({
      group: "integrations",
      kind: "group",
      slug: "integrations",
    });
  });

  it("uses the serializable entry helper for showcase and glyph props", () => {
    expect(featureDetailPageSource).toContain(
      "const serializableEntry = toSerializablePackageFeatureEntry(entry);",
    );
    expect(featureDetailPageSource).toContain("toSerializablePackageFeatureEntry(childEntry)");
    expect(featureDetailPageSource).not.toContain("entry={{ ...entry, icon: undefined }}");
    expect(featureDetailPageSource).not.toContain("entry={childEntry}");
  });
});
