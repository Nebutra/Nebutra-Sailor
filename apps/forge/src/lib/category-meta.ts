/**
 * Category accent colors (design tokens). Labels/hints live in message catalogs
 * under `categories.<id>.label` / `categories.<id>.hint` (PRODUCT_LANGUAGES wheel).
 */

const ACCENT: Record<string, string> = {
  codec: "hsl(var(--primary))",
  cn: "var(--cyan-9)",
  data: "hsl(var(--primary))",
  dev: "var(--cyan-9)",
  doc: "hsl(var(--primary))",
  finance: "var(--cyan-9)",
  hash: "hsl(var(--primary))",
  image: "var(--cyan-9)",
  life: "hsl(var(--primary))",
  llm: "var(--cyan-9)",
  security: "hsl(var(--primary))",
  text: "var(--cyan-9)",
  time: "hsl(var(--primary))",
  unit: "var(--cyan-9)",
};

export function categoryAccent(id: string): string {
  return ACCENT[id] ?? "hsl(var(--primary))";
}
