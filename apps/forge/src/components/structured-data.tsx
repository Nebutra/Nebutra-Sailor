interface StructuredDataProps {
  readonly data: unknown;
  readonly id?: string;
}

function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** Inline JSON-LD. Plain script — next/script is unstable for ld+json. */
export function StructuredData({ data, id }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: toSafeJsonLd(data) }}
    />
  );
}
