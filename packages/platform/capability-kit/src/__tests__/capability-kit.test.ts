import { describe, expect, it } from "vitest";
import { CapabilityError, runCapabilityCli } from "../index";

describe("CapabilityError", () => {
  it("carries code + suggestion and serializes via toJSON", () => {
    const e = new CapabilityError("boom", { code: "E_X", suggestion: "do y" });
    expect(e.code).toBe("E_X");
    expect(e.suggestion).toBe("do y");
    expect(e.name).toBe("CapabilityError");
    expect(e.toJSON()).toEqual({
      name: "CapabilityError",
      message: "boom",
      code: "E_X",
      suggestion: "do y",
    });
    expect(e).toBeInstanceOf(Error);
  });

  it("falls back to the subclass-supplied message on empty suggestion", () => {
    const e = new CapabilityError(
      "x",
      { code: "E", suggestion: "  " },
      { name: "CollabError", emptySuggestionFallback: "pkg-specific hint" },
    );
    expect(e.name).toBe("CollabError");
    expect(e.suggestion).toBe("pkg-specific hint");
  });

  it("keeps instanceof correct for subclasses", () => {
    class CollabError extends CapabilityError {
      constructor(m: string) {
        super(m, { code: "C", suggestion: "s" }, { name: "CollabError" });
      }
    }
    const e = new CollabError("z");
    expect(e).toBeInstanceOf(CollabError);
    expect(e).toBeInstanceOf(CapabilityError);
    expect(e.name).toBe("CollabError");
  });

  it("propagates cause when given", () => {
    const cause = new Error("root");
    const e = new CapabilityError("wrap", { code: "E", suggestion: "s", cause });
    expect(e.cause).toBe(cause);
  });
});

describe("runCapabilityCli", () => {
  const cap = (argv: string[], extra: Record<string, unknown> = {}) => {
    let out = "";
    let err = "";
    let unknown: string | null = null;
    return {
      run: () =>
        runCapabilityCli({
          capability: "demo",
          doctor: () => ({ ok: true, durationMs: 1 }),
          debug: (a?: string) => ({ arg: a ?? "none" }),
          argv: ["node", "cli", ...argv],
          write: (s) => {
            out += s;
          },
          writeErr: (s) => {
            err += s;
          },
          onUnknown: (c) => {
            unknown = c;
          },
          ...extra,
        }),
      get out() {
        return out;
      },
      get err() {
        return err;
      },
      get unknown() {
        return unknown;
      },
    };
  };

  it("doctor stamps capability onto the report", async () => {
    const c = cap(["doctor"]);
    await c.run();
    expect(JSON.parse(c.out)).toEqual({ capability: "demo", ok: true, durationMs: 1 });
  });

  it("defaults to doctor when no command", async () => {
    const c = cap([]);
    await c.run();
    expect(JSON.parse(c.out).capability).toBe("demo");
  });

  it("debug forwards the arg and stamps capability", async () => {
    const c = cap(["debug", "room42"]);
    await c.run();
    expect(JSON.parse(c.out)).toEqual({ capability: "demo", arg: "room42" });
  });

  it("routes an unknown command to onUnknown", async () => {
    const c = cap(["wat"]);
    await c.run();
    expect(c.unknown).toBe("wat");
  });
});
