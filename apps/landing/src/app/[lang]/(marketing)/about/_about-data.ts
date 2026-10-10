// Structure shared by the About sub-pages. The copy itself lives in
// apps/landing/messages/en.json under `aboutPages.*` — these arrays only name
// the keys (and carry the non-translatable bits: numbers, years, terms).

// ─── Business Portfolio (19 capabilities in 4 groups) ────────────────────────
// `aboutPages.businessPortfolio.groups.<key>.title|subtitle` and
// `aboutPages.businessPortfolio.capabilities.<item>.category|description`.
export const CAPABILITY_GROUPS = [
  {
    key: "modality",
    items: ["annotation", "govText", "urbanVideo", "speech", "gaussianSplatting", "qaPairs"],
  },
  {
    key: "technology",
    items: ["autoLabeling", "agenticDataset", "govRag", "agentWorkflow"],
  },
  {
    key: "platform",
    items: ["labelingPlatform", "saasStack", "aiGateway", "privateDeployment"],
  },
  {
    key: "governance",
    items: ["qualityControl", "compliance", "crossBorder", "datasetIncubator", "dataAsset"],
  },
] as const;

// ─── Organizational principles (innovation + whitepaper Ⅳ) ───────────────────
// `aboutPages.principles.items.<key>.title|description`.
export const ORGANIZATION_PRINCIPLES = [
  { key: "automation", number: "01" },
  { key: "governance", number: "02" },
  { key: "creativity", number: "03" },
] as const;

// ─── Harness evolution (AI stack, three layers) ──────────────────────────────
// `aboutPages.innovation.layers.<key>`; years and themes are technical terms.
export const HARNESS_TIMELINE = [
  {
    key: "weights",
    year: "2022",
    themes: [
      "Pretraining",
      "RLHF",
      "Fine-tuning",
      "Scaling Law",
      "Alignment",
      "Instruction-following",
      "Few-shot",
    ],
  },
  {
    key: "context",
    year: "2023–2024",
    themes: [
      "RAG",
      "Memory",
      "Long Context",
      "Prompting",
      "Chain-of-Thought",
      "Knowledge Injection",
      "Context Engineering",
    ],
  },
  {
    key: "harness",
    year: "2025–2026",
    themes: [
      "MCP/Skill",
      "Function Calling",
      "Tool Ecosystems",
      "Workflow Graphs",
      "Protocols",
      "Multi-agent",
      "A2A",
      "Orchestration",
      "Security",
      "Agent Infrastructure",
    ],
  },
] as const;
