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

export function usccSegments(raw: string): {
  cleaned: string;
  segments: CodeSegment[];
  complete: boolean;
} {
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  return {
    cleaned,
    complete: cleaned.length === 18,
    segments: [
      { id: "dept", label: "dept", value: cleaned.slice(0, 1) },
      { id: "category", label: "category", value: cleaned.slice(1, 2) },
      { id: "division", label: "division", value: cleaned.slice(2, 8) },
      { id: "org", label: "org", value: cleaned.slice(8, 17) },
      { id: "check", label: "check", value: cleaned.slice(17, 18) },
    ],
  };
}

export function ibanSegments(raw: string): {
  cleaned: string;
  segments: CodeSegment[];
  complete: boolean;
} {
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  return {
    cleaned,
    complete: cleaned.length >= 15,
    segments: [
      { id: "country", label: "country", value: cleaned.slice(0, 2) },
      { id: "check", label: "check", value: cleaned.slice(2, 4) },
      { id: "bban", label: "bban", value: cleaned.slice(4) },
    ],
  };
}

export function vinSegments(raw: string): {
  cleaned: string;
  segments: CodeSegment[];
  complete: boolean;
} {
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  return {
    cleaned,
    complete: cleaned.length === 17,
    segments: [
      { id: "wmi", label: "wmi", value: cleaned.slice(0, 3) },
      { id: "vds", label: "vds", value: cleaned.slice(3, 8) },
      { id: "check", label: "check", value: cleaned.slice(8, 9) },
      { id: "year", label: "year", value: cleaned.slice(9, 10) },
      { id: "plant", label: "plant", value: cleaned.slice(10, 11) },
      { id: "serial", label: "serial", value: cleaned.slice(11, 17) },
    ],
  };
}

export function isbnSegments(raw: string): {
  cleaned: string;
  kind: "isbn10" | "isbn13" | "unknown";
  segments: CodeSegment[];
  complete: boolean;
} {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
  if (cleaned.length === 13) {
    return {
      cleaned,
      kind: "isbn13",
      complete: true,
      segments: [
        { id: "prefix", label: "prefix", value: cleaned.slice(0, 3) },
        { id: "body", label: "body", value: cleaned.slice(3, 12) },
        { id: "check", label: "check", value: cleaned.slice(12, 13) },
      ],
    };
  }
  if (cleaned.length === 10) {
    return {
      cleaned,
      kind: "isbn10",
      complete: true,
      segments: [
        { id: "body", label: "body", value: cleaned.slice(0, 9) },
        { id: "check", label: "check", value: cleaned.slice(9, 10) },
      ],
    };
  }
  const body = cleaned.slice(0, Math.max(0, cleaned.length - 1));
  const check = cleaned.length > 0 ? cleaned.slice(-1) : "";
  return {
    cleaned,
    kind: "unknown",
    complete: false,
    segments: [
      { id: "body", label: "body", value: body },
      { id: "check", label: "check", value: check },
    ],
  };
}

export function gtinSegments(raw: string): {
  cleaned: string;
  segments: CodeSegment[];
  complete: boolean;
} {
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.length === 0) {
    return {
      cleaned,
      complete: false,
      segments: [
        { id: "payload", label: "payload", value: "" },
        { id: "check", label: "check", value: "" },
      ],
    };
  }
  return {
    cleaned,
    complete: [8, 12, 13, 14, 18].includes(cleaned.length),
    segments: [
      { id: "payload", label: "payload", value: cleaned.slice(0, -1) },
      { id: "check", label: "check", value: cleaned.slice(-1) },
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
