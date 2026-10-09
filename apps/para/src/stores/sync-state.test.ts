import { beforeEach, describe, expect, it } from "vitest";
import { SYNC_LABEL, syncAfterSave, useEditorStore } from "./editor-store";

const editor = () => useEditorStore.getState();
const empty = { version: 2, nodes: {}, edges: {}, viewport: { x: 0, y: 0, zoom: 1 } };

describe("sync state (待同步 / 同步中 / 已同步)", () => {
  beforeEach(() => editor().load("d", structuredClone(empty)));

  it("labels every state in LibTV's words", () => {
    expect(SYNC_LABEL).toEqual({
      saved: "已同步",
      pending: "待同步",
      saving: "同步中",
      error: "同步失败",
    });
  });

  it("maps a save result to the next state", () => {
    expect(syncAfterSave(true, 3, 3)).toBe("saved");
    expect(syncAfterSave(true, 3, 4)).toBe("pending");
    expect(syncAfterSave(false, 3, 3)).toBe("error");
  });

  it("walks pending → saving → saved around one autosave", () => {
    expect(editor().sync).toBe("saved");
    editor().createNode({ mode: "image", at: { x: 0, y: 0 } });
    expect(editor().sync).toBe("pending");
    const at = editor().beginSave();
    expect(editor().sync).toBe("saving");
    editor().endSave(true, at);
    expect(editor().sync).toBe("saved");
  });

  it("stays pending when the document changed while the save was in flight", () => {
    editor().createNode({ mode: "image", at: { x: 0, y: 0 } });
    const at = editor().beginSave();
    editor().createNode({ mode: "text", at: { x: 400, y: 0 } });
    editor().endSave(true, at);
    expect(editor().sync).toBe("pending");
  });

  it("reports a failed save", () => {
    editor().createNode({ mode: "image", at: { x: 0, y: 0 } });
    editor().endSave(false, editor().beginSave());
    expect(editor().sync).toBe("error");
  });
});

describe("hand-drawn wires", () => {
  beforeEach(() => editor().load("d", structuredClone(empty)));

  it("creates a downstream node wired from its source", () => {
    const a = editor().createNode({ mode: "image", at: { x: 0, y: 0 } }) as string;
    const b = editor().createNode({ mode: "video", at: { x: 500, y: 0 }, sourceId: a }) as string;
    const edges = Object.values(editor().document?.edges ?? {});
    expect(edges).toEqual([{ id: expect.any(String), source: a, target: b, kind: "reference" }]);
    expect(editor().document?.nodes[b]?.generator?.params?.duration).toBe(5);
    expect(editor().selection).toEqual([b]);
  });

  it("refuses duplicates and cycles", () => {
    const a = editor().createNode({ mode: "image", at: { x: 0, y: 0 } }) as string;
    const b = editor().createNode({ mode: "video", at: { x: 500, y: 0 } }) as string;
    expect(editor().connect(a, b)).toBe(true);
    expect(editor().connect(a, b)).toBe(false);
    expect(editor().connect(b, a)).toBe(false);
    expect(editor().connect(a, a)).toBe(false);
    expect(Object.keys(editor().document?.edges ?? {})).toHaveLength(1);
  });
});
