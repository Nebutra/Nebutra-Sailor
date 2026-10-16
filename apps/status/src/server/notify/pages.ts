/**
 * API-side responses for subscription links: the result of a one-click
 * unsubscribe POST, and redirects from old API links to the styled pages at
 * /subscriptions/confirm and /subscriptions/unsubscribe.
 */
import { langOf } from "./messages";

type Result = "unsubscribed" | "invalid";

const COPY = {
  zh: {
    unsubscribed: "已退订，不会再收到通知。",
    invalid: "链接无效或已过期。",
  },
  en: {
    unsubscribed: "You are unsubscribed and will receive no more notices.",
    invalid: "This link is invalid or has expired.",
  },
};

function lang(request: Request) {
  return langOf(request.headers.get("accept-language"));
}

function html(lang: "zh" | "en", body: string, status: number): Response {
  const doc = `<!doctype html><html lang="${lang === "zh" ? "zh-CN" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Nebutra Status</title><style>body{font-family:system-ui,-apple-system,sans-serif;color:#18191c;background:#f9fafb;margin:0;display:grid;place-items:center;min-height:100vh;padding:16px}main{background:#fff;border:1px solid #e4e5e8;border-radius:8px;padding:24px;max-width:420px}button{background:#18191c;color:#fff;border:0;border-radius:6px;padding:8px 14px;font:inherit;cursor:pointer}@media (prefers-color-scheme:dark){body{background:#111214;color:#ededef}main{background:#18191c;border-color:#2e3035}button{background:#ededef;color:#18191c}}</style></head><body><main>${body}</main></body></html>`;
  return new Response(doc, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export function resultPage(request: Request, result: Result, status: number): Response {
  const l = lang(request);
  return html(l, `<p>${COPY[l][result]}</p>`, status);
}

/** 303 to a styled page on this instance, carrying the token over. */
export function pageRedirect(request: Request, path: string): Response {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const location = `${path}?token=${encodeURIComponent(token)}`;
  return new Response(null, {
    status: 303,
    headers: { location, "cache-control": "no-store" },
  });
}
