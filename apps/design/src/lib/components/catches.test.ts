import { describe, expect, it } from "vitest";
import { getCatches, registerCatch, subscribeCatches } from "./catches";

describe("catches store", () => {
  it("lists a registered note and drops it when withdrawn", () => {
    const withdraw = registerCatch({ id: "a", title: "A", breaks: "x" });
    expect(getCatches().map((n) => n.id)).toEqual(["a"]);

    withdraw();
    expect(getCatches()).toEqual([]);
  });

  it("shows one note when the same example is mounted twice (Split mode)", () => {
    const first = registerCatch({ id: "b", title: "B", breaks: "x" });
    const second = registerCatch({ id: "b", title: "B", breaks: "x" });
    expect(getCatches()).toHaveLength(1);

    // One pane unmounts; the other still shows the example, so the note stays.
    first();
    expect(getCatches()).toHaveLength(1);
    second();
    expect(getCatches()).toEqual([]);
  });

  it("returns a stable snapshot until something changes", () => {
    const withdraw = registerCatch({ id: "c", title: "C", breaks: "x" });
    expect(getCatches()).toBe(getCatches());
    withdraw();
  });

  it("tells subscribers about changes, and stops after unsubscribe", () => {
    let calls = 0;
    const unsubscribe = subscribeCatches(() => {
      calls += 1;
    });

    const withdraw = registerCatch({ id: "d", title: "D", breaks: "x" });
    expect(calls).toBe(1);
    unsubscribe();
    withdraw();
    expect(calls).toBe(1);
  });
});
