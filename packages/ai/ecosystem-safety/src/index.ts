import { CapabilityError } from "@nebutra/errors";

export type SensitiveFieldKind = "email" | "secret";

export interface SensitiveField {
  readonly kind: SensitiveFieldKind;
  readonly value: string;
}

export interface PublicDisclosureSafetyRequest {
  readonly capability: string;
  readonly content: string;
  readonly redactions?: readonly string[];
  readonly suggestion?: string;
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SECRET_RE = /\b(?:sk|pk|api|key|token)[-_][A-Za-z0-9][A-Za-z0-9_-]{7,}\b/g;

function hasExplicitRedaction(redactions: readonly string[] | undefined): boolean {
  return Boolean(redactions?.some((item) => item.trim().length > 0));
}

function uniqueFields(fields: readonly SensitiveField[]): SensitiveField[] {
  const seen = new Set<string>();
  const unique: SensitiveField[] = [];
  for (const field of fields) {
    const key = `${field.kind}:${field.value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(field);
  }
  return unique;
}

export function scanForSensitiveFields(content: string): SensitiveField[] {
  const emails = [...content.matchAll(EMAIL_RE)].map((match) => ({
    kind: "email" as const,
    value: match[0],
  }));
  const secrets = [...content.matchAll(SECRET_RE)].map((match) => ({
    kind: "secret" as const,
    value: match[0],
  }));
  return uniqueFields([...emails, ...secrets]);
}

export function assertPublicDisclosureSafe(
  request: PublicDisclosureSafetyRequest,
): readonly SensitiveField[] {
  const sensitive = scanForSensitiveFields(request.content);
  if (sensitive.length > 0 && !hasExplicitRedaction(request.redactions)) {
    throw new CapabilityError(request.capability, "Sensitive fields require explicit redaction", {
      suggestion:
        request.suggestion ??
        "Review detected private values and pass explicit redactions before publishing.",
      metadata: {
        sensitiveKinds: [...new Set(sensitive.map((item) => item.kind))],
        sensitiveCount: sensitive.length,
      },
      statusCode: 400,
    });
  }
  return sensitive;
}
