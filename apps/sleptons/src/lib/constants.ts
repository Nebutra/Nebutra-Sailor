export const LOOKING_FOR_OPTIONS = [
  { value: "co-founder", label: "Co-founder" },
  { value: "designer", label: "Designer" },
  { value: "engineer", label: "Engineer" },
  { value: "early-users", label: "Early users" },
  { value: "angel-investor", label: "Angel investor" },
  { value: "industry-advisor", label: "Industry advisor" },
  { value: "sales-ops", label: "Sales / Ops" },
  { value: "nothing-solo", label: "Nothing — solo is the plan" },
] as const;

export type LookingForValue = (typeof LOOKING_FOR_OPTIONS)[number]["value"];

export const TECH_STACK_OPTIONS = [
  "Next.js",
  "React",
  "Vue",
  "Svelte",
  "Node.js",
  "Python",
  "Go",
  "Rust",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Vercel",
  "AWS",
  "Alibaba Cloud",
  "Docker",
  "OpenAI",
  "Anthropic",
  "LangChain",
  "Stripe",
  "WeChat Pay",
  "Alipay",
] as const;

export type TechStackValue = (typeof TECH_STACK_OPTIONS)[number];
