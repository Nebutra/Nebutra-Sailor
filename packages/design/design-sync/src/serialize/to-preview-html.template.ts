/**
 * to-preview-html.template.ts
 *
 * HTML / CSS template layer for the DTCG → preview.html serializer.
 *
 * Exports:
 *   - escapeHtml        — generic HTML-attribute / content escaping
 *   - cssAttrValue      — escapes a token value for use inside style="…"
 *   - cssVarsDecl       — turns a CssVarBlock into CSS custom-property lines
 *   - buildDocument     — assembles the full <!DOCTYPE html> string
 *
 * Pure: no filesystem I/O, no token resolution.
 */

// ─── HTML / CSS escaping ───────────────────────────────────────────────────────

/**
 * Escape a string for safe insertion into HTML content or attribute values.
 * Converts the five characters that have special meaning in HTML.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Escape a token-derived value for safe use inside a `style="…"` attribute.
 *
 * Strategy:
 *  1. Strip CSS structural characters that could inject extra declarations or
 *     break the style attribute — specifically `;`, `{`, `}`, `<`, `>`.
 *     NOTE: We deliberately keep `"` in the string before step 2 so that
 *     font-family values like `"Geist", sans-serif` are preserved; `escapeHtml`
 *     will turn those `"` into `&quot;` which the browser decodes correctly.
 *  2. HTML-escape the result so embedded quotes survive as `&quot;` and any
 *     remaining angle brackets become `&lt;`/`&gt;`.
 *
 * Example:
 *   cssAttrValue('"Geist", "Noto Sans SC", sans-serif')
 *   → '&quot;Geist&quot;, &quot;Noto Sans SC&quot;, sans-serif'
 *
 *   cssAttrValue('red;display:none')
 *   → 'reddisplay:none'   (semicolon stripped before HTML-escape)
 */
export function cssAttrValue(raw: string): string {
  return escapeHtml(raw.replace(/[;{}<>]/g, ""));
}

// ─── CSS variable block ────────────────────────────────────────────────────────

export interface CssVarBlock {
  primary: string;
  accent: string;
  tertiary: string;
  danger: string;
  warning: string;
  success: string;
  background: string;
  foreground: string;
}

/**
 * Render a CssVarBlock as indented CSS custom-property declarations (no braces).
 * Values come from the validated toHex path so they are hex strings, but we
 * wrap in cssAttrValue for consistency (harmless for safe hex values).
 */
export function cssVarsDecl(vars: CssVarBlock): string {
  return [
    `  --color-primary: ${vars.primary};`,
    `  --color-accent: ${vars.accent};`,
    `  --color-tertiary: ${vars.tertiary};`,
    `  --color-danger: ${vars.danger};`,
    `  --color-warning: ${vars.warning};`,
    `  --color-success: ${vars.success};`,
    `  --color-background: ${vars.background};`,
    `  --color-foreground: ${vars.foreground};`,
    `  --preview-bg: ${vars.background};`,
    `  --preview-fg: ${vars.foreground};`,
  ].join("\n");
}

// ─── Document assembly ─────────────────────────────────────────────────────────

export interface DocumentArgs {
  escapedName: string;
  lightVars: CssVarBlock;
  darkVars: CssVarBlock;
  swatchesHtml: string;
  typographyHtml: string;
  componentsHtml: string;
  radiusHtml: string;
}

/**
 * Assemble the full <!DOCTYPE html> preview document.
 *
 * Dark-mode CSS is emitted as TWO separate, valid rules:
 *   1. `:root[data-theme="dark"]`  — explicit toggle
 *   2. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`
 *      — OS/browser preference (but not when the user has explicitly chosen light)
 *
 * This avoids the invalid CSS form of comma-joining a selector with an at-rule.
 */
export function buildDocument(args: DocumentArgs): string {
  const { escapedName, lightVars, darkVars } = args;
  const darkVarsDecl = cssVarsDecl(darkVars);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedName} — Design System Preview</title>
  <style>
    /* ── Light mode tokens (default) ────────────────────────── */
    :root {
${cssVarsDecl(lightVars)}
    }

    /* ── Dark mode tokens — explicit toggle ─────────────────── */
    :root[data-theme="dark"] {
${darkVarsDecl}
    }

    /* ── Dark mode tokens — OS/browser preference ───────────── */
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
${darkVarsDecl}
      }
    }

    /* ── Base reset ─────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      background: var(--color-background);
      color: var(--color-foreground);
      padding: 2rem;
    }

    /* ── Layout ─────────────────────────────────────────────── */
    .preview-header {
      border-bottom: 1.5px solid rgba(128,128,128,0.18);
      padding-bottom: 1.5rem;
      margin-bottom: 2.5rem;
    }
    .preview-title {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.25rem;
      background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .preview-subtitle {
      font-size: 0.875rem;
      opacity: 0.6;
      margin: 0;
    }

    .preview-section {
      margin-bottom: 3rem;
    }
    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(128,128,128,0.12);
    }

    /* ── Swatches ────────────────────────────────────────────── */
    .swatch-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .swatch {
      width: 120px;
    }
    .swatch-color {
      width: 120px;
      height: 80px;
      border-radius: 8px;
      display: flex;
      align-items: flex-end;
      padding: 0.4rem;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .swatch-hex {
      font-size: 0.65rem;
      font-family: ui-monospace, monospace;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .swatch-label {
      margin-top: 0.4rem;
      font-size: 0.75rem;
      font-weight: 500;
    }

    /* ── Typography ──────────────────────────────────────────── */
    .type-stack {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .type-sample {
      border-left: 3px solid var(--color-primary);
      padding-left: 1rem;
    }
    .type-meta {
      font-size: 0.7rem;
      font-family: ui-monospace, monospace;
      opacity: 0.55;
      margin-bottom: 0.4rem;
    }
    .type-preview {
      line-height: 1.3;
    }

    /* ── Components ──────────────────────────────────────────── */
    .component-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      align-items: flex-start;
    }
    .component-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .component-label {
      font-size: 0.7rem;
      font-family: ui-monospace, monospace;
      opacity: 0.55;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* ── Radius ──────────────────────────────────────────────── */
    .radius-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      align-items: flex-end;
    }
    .radius-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
    }
    .radius-demo {
      width: 56px;
      height: 56px;
      background: var(--color-primary);
      opacity: 0.8;
    }
    .radius-name {
      font-size: 0.7rem;
      font-weight: 600;
    }
    .radius-value {
      font-size: 0.65rem;
      font-family: ui-monospace, monospace;
      opacity: 0.55;
    }
  </style>
</head>
<body>

  <header class="preview-header">
    <h1 class="preview-title">${escapedName}</h1>
    <p class="preview-subtitle">Design System Preview &mdash; generated from DTCG token sets</p>
  </header>

  <main>
    ${args.swatchesHtml}
    ${args.typographyHtml}
    ${args.componentsHtml}
    ${args.radiusHtml}
  </main>

</body>
</html>`;
}
