import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_NAME,
  hasBlockingProjectMarkers,
  isCurrentDirToken,
  isDirEffectivelyEmpty,
  preferCurrentDirectory,
  resolveTargetFromInput,
  validateProjectName,
} from "../project-target";

const tmpDirs: string[] = [];

function makeTmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-target-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("isCurrentDirToken", () => {
  it("recognizes . and ./", () => {
    expect(isCurrentDirToken(".")).toBe(true);
    expect(isCurrentDirToken("./")).toBe(true);
    expect(isCurrentDirToken("my-app")).toBe(false);
  });
});

describe("isDirEffectivelyEmpty", () => {
  it("treats missing and empty dirs as empty", () => {
    const dir = makeTmp();
    expect(isDirEffectivelyEmpty(dir)).toBe(true);
    expect(isDirEffectivelyEmpty(path.join(dir, "nope"))).toBe(true);
  });

  it("ignores .git and OS junk", () => {
    const dir = makeTmp();
    fs.mkdirSync(path.join(dir, ".git"));
    fs.writeFileSync(path.join(dir, ".DS_Store"), "");
    expect(isDirEffectivelyEmpty(dir)).toBe(true);
  });

  it("detects real content", () => {
    const dir = makeTmp();
    fs.writeFileSync(path.join(dir, "README.md"), "hi");
    expect(isDirEffectivelyEmpty(dir)).toBe(false);
  });
});

describe("hasBlockingProjectMarkers", () => {
  it("flags package.json / lockfiles / node_modules", () => {
    const dir = makeTmp();
    expect(hasBlockingProjectMarkers(dir)).toBe(false);
    fs.writeFileSync(path.join(dir, "package.json"), "{}");
    expect(hasBlockingProjectMarkers(dir)).toBe(true);
  });
});

describe("preferCurrentDirectory", () => {
  it("prefers current when empty, new folder when busy", () => {
    const empty = makeTmp();
    expect(preferCurrentDirectory(empty)).toBe(true);

    const busy = makeTmp();
    fs.writeFileSync(path.join(busy, "notes.txt"), "x");
    expect(preferCurrentDirectory(busy)).toBe(false);
  });
});

describe("validateProjectName", () => {
  it("accepts common names", () => {
    expect(validateProjectName("my-app")).toBeUndefined();
    expect(validateProjectName("Acme_1")).toBeUndefined();
  });

  it("rejects empty and illegal chars", () => {
    expect(validateProjectName("")).toBeTruthy();
    expect(validateProjectName("  ")).toBeTruthy();
    expect(validateProjectName("my app")).toBeTruthy();
  });
});

describe("resolveTargetFromInput", () => {
  it("defaults bare empty to my-app", () => {
    const r = resolveTargetFromInput("", "/tmp/work");
    expect(r).toEqual({
      targetDir: `./${DEFAULT_PROJECT_NAME}`,
      projectName: DEFAULT_PROJECT_NAME,
      absoluteDir: path.resolve("/tmp/work", DEFAULT_PROJECT_NAME),
    });
  });

  it("maps bare names to ./name", () => {
    const r = resolveTargetFromInput("acme", "/home/me");
    expect(r.targetDir).toBe("./acme");
    expect(r.projectName).toBe("acme");
    expect(r.absoluteDir).toBe(path.resolve("/home/me", "acme"));
  });

  it("maps . to current directory basename", () => {
    const r = resolveTargetFromInput(".", "/home/me/acme");
    expect(r.targetDir).toBe(".");
    expect(r.projectName).toBe("acme");
    expect(r.absoluteDir).toBe(path.resolve("/home/me/acme"));
  });

  it("keeps explicit relative paths", () => {
    const r = resolveTargetFromInput("./apps/web", "/repo");
    expect(r.targetDir).toBe("./apps/web");
    expect(r.projectName).toBe("web");
  });
});
