import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextResponse } from "next/server";
import { i18n } from "./lib/i18n";

const i18nProxy = createI18nMiddleware(i18n);
const markdownDocsPath = rewritePath("/:lang/:slug{/*rest}", "/llms.mdx/docs/:lang/:slug{/*rest}");
const localizedDocsPath = new RegExp(`^/(${i18n.languages.join("|")})/[^/]+`);

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
  // Matcher ignoring `/_next/`, `/api/`, and static assets like `/logo/`
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo).*)"],
};
