import type { AnyStructuredData } from "@/lib/seo/structured-data";

interface StructuredDataProps {
  /** A single schema object or an array of them. Rendered as JSON-LD. */
  data: AnyStructuredData | ReadonlyArray<AnyStructuredData>;
  /** Optional id for the script tag (useful for HMR / debugging). */
  id?: string;
}

/**
 * Escape `<` to prevent the JSON payload from prematurely closing the
 * surrounding `<script>` tag (XSS-hardening). `JSON.stringify` already
 * escapes quotes, so this single replacement is sufficient.
 */
function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Renders inline `<script type="application/ld+json">` for the provided
 * schema(s). Multiple schemas may be passed as an array.
 *
 * Note: We intentionally use a plain `<script>` element (not `next/script`)
 * because Next.js requires structured-data scripts to be inline rather
 * than deferred, and `next/script` does not support `type="application/ld+json"`
 * with inline children in a stable way across runtimes.
 */
export function StructuredData({ data, id }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      id={id}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for JSON-LD
      dangerouslySetInnerHTML={{ __html: toSafeJsonLd(data) }}
    />
  );
}
