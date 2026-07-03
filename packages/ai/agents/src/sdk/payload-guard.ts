export const OPENAI_MAX_PROPERTY_NAME_LENGTH = 256;

export interface OversizedPropertyNameIssue {
  readonly path: string;
  readonly length: number;
}

function isObjectLike(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function pathSegment(key: string): string {
  const preview = key.length > 32 ? `${key.slice(0, 29)}...` : key;
  return /^[A-Za-z_$][\w$]*$/.test(preview) ? `.${preview}` : `[${JSON.stringify(preview)}]`;
}

export function findOversizedPropertyName(
  value: unknown,
  maxLength = OPENAI_MAX_PROPERTY_NAME_LENGTH,
): OversizedPropertyNameIssue | null {
  const seen = new WeakSet<object>();

  function visit(candidate: unknown, path: string): OversizedPropertyNameIssue | null {
    if (!isObjectLike(candidate)) return null;
    if (seen.has(candidate)) return null;
    seen.add(candidate);

    if (Array.isArray(candidate)) {
      for (let index = 0; index < candidate.length; index += 1) {
        const issue = visit(candidate[index], `${path}[${index}]`);
        if (issue) return issue;
      }
      return null;
    }

    for (const [key, nested] of Object.entries(candidate)) {
      const nestedPath = `${path}${pathSegment(key)}`;
      if (key.length > maxLength) {
        return { path: nestedPath, length: key.length };
      }
      const issue = visit(nested, nestedPath);
      if (issue) return issue;
    }

    return null;
  }

  return visit(value, "$");
}

export function assertSafeOpenAIJsonPayload(label: string, value: unknown): void {
  const issue = findOversizedPropertyName(value);
  if (!issue) return;

  throw new Error(
    `${label} contains an object property name at ${issue.path} that is ${issue.length} characters long; maximum is ${OPENAI_MAX_PROPERTY_NAME_LENGTH}. Put generated text in a string value instead of using it as a JSON key.`,
  );
}
