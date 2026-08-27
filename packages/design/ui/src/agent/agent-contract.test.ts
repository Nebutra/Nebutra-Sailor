import { describe, expect, it } from "vitest";
import {
  type AgentComponentContract,
  type AgentManifest,
  searchAgentComponents,
  validateAgentComponent,
} from ".";

const button: AgentComponentContract = {
  name: "button",
  title: "Button",
  description: "Primary action primitive",
  status: "stable",
  maturity: "canonical",
  layer: "primitive",
  source: "packages/design/ui/src/primitives/button.tsx",
  href: "https://ui.nebutra.com/agent/components/button.json",
  tags: ["business", "canonical", "native", "primitive", "stable", "tokens"],
  package: "@nebutra/ui",
  substrate: "native",
  imports: {
    package: "@nebutra/ui/primitives",
    registry: "https://ui.nebutra.com/r/button.json",
  },
  dependencies: { npm: ["class-variance-authority"], registry: [] },
  files: [{ path: "components/ui/button.tsx", type: "registry:ui" }],
  tokens: ["--neutral-1"],
  evidence: {
    source: true,
    docs: true,
    storybook: true,
    registry: true,
    tokens: true,
  },
  docs: {
    source: "/en/docs/components/button",
    routes: ["/en/docs/components/button"],
    storybook: "packages/design/ui/src/primitives/button.stories.tsx",
    lastVerified: "2026-05-21",
  },
  usage: {
    recommended: "Use package imports inside Nebutra apps.",
    antiPatterns: ["Do not import registry JSON as source of truth."],
  },
  migration: {
    requiredForBreakingChanges: true,
    codemods: [],
    hints: ["Breaking renames require a dry-run codemod entry."],
  },
};

const manifest: AgentManifest = {
  $schema: "https://ui.nebutra.com/schemas/nebutra-ui-agent.v1.json",
  name: "nebutra-ui-agent",
  version: 1,
  generatedAt: "2026-07-06",
  homepage: "https://ui.nebutra.com",
  registry: "https://ui.nebutra.com/registry.json",
  commands: [],
  rules: {
    sourceOfTruth: [],
    importPolicy: "Use package imports.",
    registryPolicy: "Registry is distribution.",
    tokenPolicy: "Tokens own CSS variables.",
  },
  components: [button],
};

describe("@nebutra/ui/agent", () => {
  it("searches components with ranked pagination metadata", () => {
    const result = searchAgentComponents(manifest, "button", { limit: 1 });

    expect(result).toMatchObject({
      query: "button",
      total: 1,
      count: 1,
      hasMore: false,
    });
    expect(result.items[0]?.name).toBe("button");
  });

  it("validates canonical production evidence", () => {
    expect(validateAgentComponent(button)).toMatchObject({
      name: "button",
      valid: true,
      errors: [],
    });
  });

  it("fails canonical components without Storybook evidence", () => {
    const invalid = {
      ...button,
      evidence: { ...button.evidence, storybook: false },
      docs: {
        source: button.docs.source,
        routes: button.docs.routes,
        lastVerified: button.docs.lastVerified,
      },
    };

    expect(validateAgentComponent(invalid)).toMatchObject({
      valid: false,
      errors: ["Stable/canonical components must have Storybook evidence."],
    });
  });
});
