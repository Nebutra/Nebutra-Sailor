/**
 * Server-side render helper that bridges the registry key to the typed
 * template module. The cast on `render`/`subject` is justified because the
 * preview app intentionally accepts arbitrary JSON props from the editor — type
 * safety is enforced at the catalog level instead.
 */

import { REACT_EMAIL_TEMPLATES } from "@nebutra/email";

export interface RenderedTemplate {
  subject: string;
  html: string;
  plainText: string;
}

type TemplateKey = keyof typeof REACT_EMAIL_TEMPLATES;

const KEY_BY_ID: Record<string, TemplateKey> = Object.fromEntries(
  (
    Object.entries(REACT_EMAIL_TEMPLATES) as Array<
      [TemplateKey, (typeof REACT_EMAIL_TEMPLATES)[TemplateKey]]
    >
  ).map(([key, value]) => [value.id, key]),
);

export function renderTemplate(
  templateId: string,
  props: Record<string, unknown>,
): RenderedTemplate {
  const key = KEY_BY_ID[templateId];
  if (!key) {
    throw new Error(`Unknown template id: ${templateId}`);
  }
  const template = REACT_EMAIL_TEMPLATES[key];

  // Cast: the email package types `render`/`subject` to the strict Props of
  // each template. The preview app deliberately allows arbitrary user-edited
  // JSON — runtime errors surface in the UI as a friendly "render failed"
  // message rather than crashing the server.
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  const html = (template.render as (input: any) => string)(props);
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  const subject = (template.subject as (input: any) => string)(props);

  return {
    subject,
    html,
    plainText: htmlToPlainText(html),
  };
}

/** Minimal HTML → plain text fallback. Sufficient for inline preview. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rarr;/g, "→")
    .replace(/&mdash;/g, "—")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}
