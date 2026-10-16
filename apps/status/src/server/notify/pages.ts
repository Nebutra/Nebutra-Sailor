/**
 * The two tiny HTML pages a subscriber sees from an email link: the result of
 * confirming or unsubscribing, and the unsubscribe button. Self-contained, in
 * the browser's language, no app chrome.
 */
import { langOf } from "./messages";

type Result = "confirmed" | "unsubscribed" | "invalid";

const COPY = {
  zh: {
    confirmed: "订阅已确认。之后的事故与维护通知会发到你的邮箱。",
    unsubscribed: "已退订，不会再收到通知。",
    invalid: "链接无效或已过期。",
    ask: "确定退订这些状态通知吗？",
    button: "退订",
  },
  en: {
    confirmed: "Subscription confirmed. Incident and maintenance notices will reach your inbox.",
    unsubscribed: "You are unsubscribed and will receive no more notices.",
    invalid: "This link is invalid or has expired.",
    ask: "Unsubscribe from these status notifications?",
    button: "Unsubscribe",
  },
};

function lang(request: Request) {
  return langOf(request.headers.get("accept-language"));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
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

export function unsubscribeForm(request: Request, token: string): Response {
  const l = lang(request);
  if (!token) return resultPage(request, "invalid", 404);
  return html(
    l,
    `<p>${COPY[l].ask}</p><form method="post"><input data-allow-native type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">${COPY[l].button}</button></form>`,
    200,
  );
}
