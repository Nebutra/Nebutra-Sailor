/**
 * Client-safe types and pure helpers for the template registry.
 * No imports from `@nebutra/email` so this module can be bundled for the
 * browser without dragging in nodemailer/server-only code.
 */

export interface TemplateMeta {
  /** Stable ID used in URLs and API calls. */
  id: string;
  /** Registry key (welcome | passwordReset | invitation | receipt). */
  key: string;
  label: string;
  description: string;
  fileName: string;
  /** Serialised default props — used to seed the JSON editor. */
  defaultProps: Record<string, unknown>;
  /** Loose grouping for sidebar headings. */
  category: string;
}

export function groupTemplatesByCategory(
  templates: readonly TemplateMeta[],
): Array<{ category: string; items: TemplateMeta[] }> {
  const groups = new Map<string, TemplateMeta[]>();
  for (const t of templates) {
    const existing = groups.get(t.category);
    if (existing) {
      existing.push(t);
    } else {
      groups.set(t.category, [t]);
    }
  }
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
}
