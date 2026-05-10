/**
 * Shared HTML layout for the React Email-style template catalog.
 *
 * NOTE: react-email is NOT installed in this workspace. This module ships a
 * plain template literal layout instead so the templates remain framework-free
 * and can be rendered without a React runtime. The contract still mirrors a
 * future React Email migration: each template module exports
 * `{ subject, preview, render }` and the renderer returns a complete HTML
 * document.
 */

export interface RenderedEmail {
  html: string;
  subject: string;
  preview: string;
}

const BRAND_GRADIENT = "linear-gradient(135deg,#0033FE,#0BF1C3)";
const COLOR_BG = "#f8fafc";
const COLOR_BORDER = "#e2e8f0";
const COLOR_HEADING = "#0f172a";
const COLOR_BODY = "#475569";
const COLOR_MUTED = "#94a3b8";

export interface BaseLayoutOptions {
  brandName: string;
  preview: string;
  body: string;
}

/**
 * Wrap a body fragment with the standard Nebutra-style transactional shell.
 */
export function baseLayout({ brandName, preview, body }: BaseLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(brandName)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}&nbsp;&zwnj;&nbsp;</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLOR_BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid ${COLOR_BORDER};overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:${BRAND_GRADIENT};padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${escapeHtml(brandName)}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          ${body}
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid ${COLOR_BORDER};background:${COLOR_BG};">
          <p style="margin:0;font-size:12px;color:${COLOR_MUTED};text-align:center;">
            &copy; ${new Date().getFullYear()} ${escapeHtml(brandName)} &middot;
            <a href="https://nebutra.ai/privacy" style="color:${COLOR_MUTED};">Privacy</a> &middot;
            <a href="https://nebutra.ai/unsubscribe" style="color:${COLOR_MUTED};">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const palette = {
  gradient: BRAND_GRADIENT,
  background: COLOR_BG,
  border: COLOR_BORDER,
  heading: COLOR_HEADING,
  body: COLOR_BODY,
  muted: COLOR_MUTED,
} as const;

/**
 * Conservative HTML escape for user-supplied template props.
 *
 * Templates accept structured props from trusted backend code, but escaping is
 * still required because some props (e.g. organization names, invoice numbers)
 * may originate from end-user input.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
