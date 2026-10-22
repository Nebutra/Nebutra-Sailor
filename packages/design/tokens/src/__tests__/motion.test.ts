import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dampingRatio,
  springOvershoot,
  springSettleMs,
  springToLinear,
} from "@nebutra/design-tokens/scripts/spring.mjs";
import { TOKEN_VALUES } from "../values";

const table = TOKEN_VALUES as Record<string, { light?: string; dark?: string }>;
const light = (name: string): string => {
  const value = table[name]?.light;
  assert.ok(value !== undefined, `--${name.replace(/^--/, "")} is not declared`);
  return value;
};
/** The stylesheet is formatted by biome, which wraps long linear() lists. */
const flat = (value: string): string => value.replace(/\s+/gu, " ").replace(/\( /gu, "(");

const SPRINGS = ["snappy", "smooth", "bouncy"] as const;
const ROLES = ["enter", "exit", "swap", "shared", "press"] as const;

describe("motion tokens", () => {
  it("keeps every pre-existing rail and curve", () => {
    assert.equal(light("--motion-duration-micro"), "100ms");
    assert.equal(light("--motion-duration-flow"), "200ms");
    assert.equal(light("--motion-duration-reveal"), "300ms");
    assert.equal(light("--motion-duration-cinematic"), "500ms");
    assert.equal(light("--motion-ease-out"), "cubic-bezier(0.16, 1, 0.3, 1)");
    assert.equal(light("--motion-ease-in"), "cubic-bezier(0.4, 0, 1, 1)");
    assert.equal(light("--motion-ease-in-out"), "cubic-bezier(0.4, 0, 0.2, 1)");
    assert.equal(light("--motion-ease-spring"), "cubic-bezier(0.175, 0.885, 0.32, 1.275)");
    assert.equal(light("--duration-reveal"), "300ms");
  });

  it("declares physics and the derived CSS half for every spring", () => {
    for (const name of SPRINGS) {
      for (const part of ["stiffness", "damping", "mass", "duration", "easing"]) {
        assert.ok(table[`--spring-${name}-${part}`], `--spring-${name}-${part} missing`);
      }
      assert.match(light(`--spring-${name}-duration`), /^\d+ms$/u);
      assert.match(flat(light(`--spring-${name}-easing`)), /^linear\(0, [\d., -]+, 1\)$/u);
    }
  });

  it("derives the CSS curve from the very parameters it publishes for JS", () => {
    for (const name of SPRINGS) {
      const params = {
        stiffness: Number(light(`--spring-${name}-stiffness`)),
        damping: Number(light(`--spring-${name}-damping`)),
        mass: Number(light(`--spring-${name}-mass`)),
      };
      assert.equal(light(`--spring-${name}-duration`), `${springSettleMs(params)}ms`);
      assert.equal(flat(light(`--spring-${name}-easing`)), springToLinear(params));
    }
  });

  it("orders the presets by character: smooth never overshoots, bouncy most", () => {
    const params = (name: string) => ({
      stiffness: Number(light(`--spring-${name}-stiffness`)),
      damping: Number(light(`--spring-${name}-damping`)),
      mass: Number(light(`--spring-${name}-mass`)),
    });
    assert.ok(springOvershoot(params("smooth")) < 0.005);
    assert.ok(springOvershoot(params("snappy")) > springOvershoot(params("smooth")));
    assert.ok(springOvershoot(params("bouncy")) > springOvershoot(params("snappy")));
    assert.ok(dampingRatio(params("bouncy")) < dampingRatio(params("snappy")));
  });

  it("orders stagger and distance as ascending scales", () => {
    const ms = (name: string) => Number.parseFloat(light(name));
    assert.ok(ms("--stagger-tight") < ms("--stagger-normal"));
    assert.ok(ms("--stagger-normal") < ms("--stagger-loose"));
    const px = ["xs", "sm", "md", "lg"].map((step) => ms(`--distance-${step}`));
    assert.deepEqual(
      px,
      [...px].sort((a, b) => a - b),
    );
    assert.equal(new Set(px).size, 4);
  });

  it("defines duration, easing and distance for every role", () => {
    for (const role of ROLES) {
      for (const part of ["duration", "easing", "distance"]) {
        assert.ok(table[`--motion-${role}-${part}`], `--motion-${role}-${part} missing`);
      }
    }
    assert.equal(light("--motion-press-scale"), "0.97");
  });

  it("never points a role at a variable that does not exist", () => {
    const dangling: string[] = [];
    for (const [name, entry] of Object.entries(table)) {
      if (!/^--(motion-(enter|exit|swap|shared|press)|spring|stagger|distance)-/u.test(name)) {
        continue;
      }
      for (const value of [entry.light, entry.dark]) {
        for (const [, ref] of (value ?? "").matchAll(/var\((--[\w-]+)/gu)) {
          if (ref !== undefined && !table[ref]) dangling.push(`${name} -> ${ref}`);
        }
      }
    }
    assert.deepEqual(dangling, []);
  });

  it("keeps the role durations on the governed rails", () => {
    assert.equal(light("--motion-enter-duration"), "var(--motion-duration-reveal)");
    assert.equal(light("--motion-exit-duration"), "var(--motion-duration-flow)");
    assert.equal(light("--motion-press-duration"), "var(--motion-duration-micro)");
    assert.equal(light("--motion-shared-easing"), "var(--spring-smooth-easing)");
  });
});
