import { describe, expect, it } from "vitest";
import {
  type Definition,
  DefinitionResolver,
  parseFrontmatter,
  substituteArguments,
} from "./definitions";

const def = (
  over: Partial<Definition> & Pick<Definition, "slug" | "tenantId" | "sourceTier">,
): Definition => ({
  frontmatter: {
    name: over.slug,
    description: "",
    allowedTools: [],
    disallowedTools: [],
    argNames: [],
    modelInvocable: true,
    userInvocable: true,
    executionMode: "inline",
    paths: [],
  },
  bodyRef: "ref",
  ...over,
});

describe("parseFrontmatter", () => {
  it("parses fields + kebab aliases + inverted disable-model-invocation", () => {
    const { frontmatter, body } = parseFrontmatter(
      `---\nname: deploy\ndescription: ship it\nallowed-tools: [Bash, Edit]\ndisable-model-invocation: true\ncontext: fork\n---\nrun the deploy`,
    );
    expect(frontmatter.name).toBe("deploy");
    expect(frontmatter.allowedTools).toEqual(["Bash", "Edit"]);
    expect(frontmatter.modelInvocable).toBe(false);
    expect(frontmatter.executionMode).toBe("fork");
    expect(body.trim()).toBe("run the deploy");
  });
  it("throws when the frontmatter block is missing", () => {
    expect(() => parseFrontmatter("no frontmatter here")).toThrow(/frontmatter/);
  });
});

describe("DefinitionResolver", () => {
  it("higher tier overrides lower on slug collision", () => {
    const r = new DefinitionResolver([
      def({ slug: "x", tenantId: "t", sourceTier: "bundled" }),
      def({ slug: "x", tenantId: "t", sourceTier: "plugin" }),
    ]);
    const out = r.resolve({ tenantId: "t" });
    expect(out).toHaveLength(1);
    expect(out[0]?.sourceTier).toBe("plugin");
  });
  it("isolates tenants — fail closed", () => {
    const r = new DefinitionResolver([def({ slug: "x", tenantId: "t_a", sourceTier: "builtin" })]);
    expect(r.resolve({ tenantId: "t_b" })).toHaveLength(0);
    expect(() => r.resolve({ tenantId: "" })).toThrow();
  });
  it("dual gate: availability (plan) ∧ enabled", () => {
    const r = new DefinitionResolver([
      def({ slug: "pro", tenantId: "t", sourceTier: "builtin", availabilityPlans: ["pro"] }),
      def({ slug: "off", tenantId: "t", sourceTier: "builtin", enabled: false }),
    ]);
    expect(r.resolve({ tenantId: "t" }).map((d) => d.slug)).toEqual([]);
    expect(r.resolve({ tenantId: "t", plan: "pro" }).map((d) => d.slug)).toEqual(["pro"]);
  });
});

describe("substituteArguments", () => {
  it("substitutes named args then variables, blanks unknowns", () => {
    expect(
      substituteArguments(
        "deploy ${env} as ${SESSION} ${missing}",
        { env: "prod" },
        { SESSION: "s1" },
      ),
    ).toBe("deploy prod as s1 ");
  });
});
