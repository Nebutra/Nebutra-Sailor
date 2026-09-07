import { describe, expect, it } from "vitest";
import { getSection } from "../../features/resume/editor/sections";
import {
  emptyContent,
  emptyItem,
  itemTitle,
  resumeReducer,
} from "../../features/resume/editor/state";

describe("resumeReducer", () => {
  const base = emptyContent("Alice");

  it("setField never mutates and normalises empty strings to undefined", () => {
    const next = resumeReducer(base, {
      type: "setField",
      section: "basic",
      key: "email",
      value: "a@b.co",
    });
    expect(next).not.toBe(base);
    expect(next.basic.email).toBe("a@b.co");
    const cleared = resumeReducer(next, {
      type: "setField",
      section: "basic",
      key: "email",
      value: "",
    });
    expect(cleared.basic.email).toBeUndefined();
    expect(base.basic.email).toBeUndefined();
  });

  it("addItem pre-fills select defaults; removeItem drops empty list to undefined", () => {
    const added = resumeReducer(base, { type: "addItem", section: "experiences" });
    expect(added.experiences).toHaveLength(1);
    expect(added.experiences?.[0]?.kind).toBe("work");
    const removed = resumeReducer(added, { type: "removeItem", section: "experiences", index: 0 });
    expect(removed.experiences).toBeUndefined();
  });

  it("setItemField and moveItem keep other items intact", () => {
    let s = resumeReducer(base, { type: "addItem", section: "projects" });
    s = resumeReducer(s, { type: "addItem", section: "projects" });
    s = resumeReducer(s, {
      type: "setItemField",
      section: "projects",
      index: 0,
      key: "name",
      value: "First",
    });
    s = resumeReducer(s, {
      type: "setItemField",
      section: "projects",
      index: 1,
      key: "name",
      value: "Second",
    });
    const moved = resumeReducer(s, {
      type: "moveItem",
      section: "projects",
      index: 1,
      direction: -1,
    });
    expect(moved.projects?.map((p) => p.name)).toEqual(["Second", "First"]);
    // out of range is a no-op returning the same reference
    expect(
      resumeReducer(moved, { type: "moveItem", section: "projects", index: 0, direction: -1 }),
    ).toBe(moved);
  });

  it("setSkills clears the skills object when every category is empty", () => {
    const s = resumeReducer(base, { type: "setSkills", category: "programming", values: ["Go"] });
    expect(s.skills).toEqual({ programming: ["Go"] });
    const cleared = resumeReducer(s, { type: "setSkills", category: "programming", values: [] });
    expect(cleared.skills).toBeUndefined();
  });

  it("setInterests and replace", () => {
    const s = resumeReducer(base, { type: "setInterests", values: ["tea"] });
    expect(s.interests).toEqual(["tea"]);
    expect(resumeReducer(s, { type: "replace", content: base })).toBe(base);
  });
});

describe("helpers", () => {
  it("emptyItem only seeds select defaults", () => {
    const def = getSection("ventures");
    const item = emptyItem(def.kind === "list" ? def.fields : []);
    expect(item).toEqual({ stage: "idea" });
  });

  it("itemTitle falls back when the title key is blank", () => {
    expect(itemTitle({ name: "  " }, "name", "Venture 1")).toBe("Venture 1");
    expect(itemTitle({ name: "LexBot" }, "name", "Venture 1")).toBe("LexBot");
  });
});
