import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextResponse } from "next/server";
import { i18n } from "./lib/i18n";

const i18nProxy = createI18nMiddleware(i18n);
const markdownDocsPath = rewritePath("/:lang/docs{/*slug}", "/llms.mdx/docs/:lang{/*slug}");
const localizedDocsPath = new RegExp(`^/(${i18n.languages.join("|")})/docs(?:/|$)`);

export function proxy(...args: Parameters<typeof i18nProxy>) {
  const [request] = args;
  const markdownResponse = rewriteMarkdownRequest(request);
  if (markdownResponse) {
    return markdownResponse;
  }

  return i18nProxy(...args);
}

function rewriteMarkdownRequest(request: Parameters<typeof i18nProxy>[0]) {
  const pathname = request.nextUrl.pathname;
  if (!localizedDocsPath.test(pathname) || !isMarkdownPreferred(request)) {
    return undefined;
  }

  const targetPath = markdownDocsPath.rewrite(pathname);
  if (!targetPath) {
    return undefined;
  }

  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  return NextResponse.rewrite(url);
}

export const config = {
  // Keep framework internals, API routes, and static brand assets out of locale negotiation.
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|favicon.ico|logo(?:/|$)).*)"],
};
