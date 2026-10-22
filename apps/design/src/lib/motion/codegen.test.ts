import { describe, expect, it } from "vitest";
import { springCss, springJs, springTokenJson, toTokenName } from "./codegen";
import { springSettleMs, springToLinear } from "./spring";

const params = { stiffness: 320, damping: 22, mass: 1.2 };

describe("toTokenName", () => {
  it("kebab-cases whatever the user typed", () => {
    expect(toTokenName("  My Spring #2 ")).toBe("my-spring-2");
    expect(toTokenName("Snappy")).toBe("snappy");
  });

  it("falls back to a usable name rather than an empty one", () => {
    expect(toTokenName("")).toBe("custom");
    expect(toTokenName("***")).toBe("custom");
  });
});

describe("springTokenJson", () => {
  it("authors physics only, as a DTCG group that deriveSpring would accept", () => {
    const parsed = JSON.parse(springTokenJson("pop", params));
    expect(Object.keys(parsed)).toEqual(["spring"]);
    expect(parsed.spring.pop.stiffness).toEqual({ $value: 320, $type: "number" });
    expect(parsed.spring.pop.damping).toEqual({ $value: 22, $type: "number" });
    expect(parsed.spring.pop.mass).toEqual({ $value: 1.2, $type: "number" });
    expect(parsed.spring.pop.easing).toBeUndefined();
    expect(parsed.spring.pop.duration).toBeUndefined();
  });
});

describe("springCss", () => {
  it("publishes the derived duration and curve under the token names the build would emit", () => {
    const css = springCss("snappy", params);
    expect(css).toContain(`--spring-snappy-duration: ${springSettleMs(params)}ms;`);
    expect(css).toContain(`--spring-snappy-easing: ${springToLinear(params)};`);
  });

  it("shows how to consume them", () => {
    const css = springCss("snappy", params);
    expect(css).toContain(
      "transition: transform var(--spring-snappy-duration) var(--spring-snappy-easing);",
    );
  });
});

describe("springJs", () => {
  it("gives the three numbers in the shape Motion and react-spring read", () => {
    const js = springJs("pop", params);
    expect(js).toContain('type: "spring"');
    expect(js).toContain("stiffness: 320");
    expect(js).toContain("damping: 22");
    expect(js).toContain("mass: 1.2");
  });

  it("includes a WAAPI form that replays the same curve", () => {
    const js = springJs("pop", params);
    expect(js).toContain(`duration: ${springSettleMs(params)}`);
    expect(js).toContain(`easing: "${springToLinear(params)}"`);
  });
});
