/** Pure helpers for specimens — safe to unit-test without JSX. */

export type CodeSegment = {
  id: string;
  label: string;
  value: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  error?: boolean;
};

export function cnIdCardSegments(raw: string): {
  cleaned: string;
  segments: CodeSegment[];
  complete: boolean;
} {
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  return {
    cleaned,
    complete: cleaned.length === 18,
    segments: [
      { id: "region", label: "region", value: cleaned.slice(0, 6) },
      { id: "birth", label: "birth", value: cleaned.slice(6, 14) },
      { id: "seq", label: "seq", value: cleaned.slice(14, 17) },
      { id: "check", label: "check", value: cleaned.slice(17, 18) },
    ],
  };
}

export function formatCardGroups(digits: string): string {
  const d = digits.replace(/\D/g, "");
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function splitJwtParts(token: string): [string, string, string] {
  const t = token.trim();
  const [h = "", p = "", s = ""] = t.split(".");
  return [h, p, s];
}

export function filePaperStats(content: string): { lines: number; chars: number } {
  if (content.length === 0) return { lines: 0, chars: 0 };
  return { lines: content.split(/\r\n|\r|\n/).length, chars: content.length };
}
