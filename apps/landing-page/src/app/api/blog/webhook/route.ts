import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

type SanityBlogWebhookPayload = {
  _type?: string;
  slug?: { current?: string };
  language?: string;
};

function localizedPath(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;

  const crypto = await import("node:crypto");
  const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const isVerified = await verifySignature(body, req.headers.get("sanity-webhook-signature"));

  if (!isVerified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SanityBlogWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload._type !== "post") {
    return NextResponse.json({ ok: true, skipped: "not a blog post" });
  }

  const slug = payload.slug?.current;
  const affectedLocales =
    payload.language === "zh" ? ["zh"] : routing.locales.filter((l) => l !== "zh");

  revalidateTag("blog", "max");
  for (const locale of affectedLocales) {
    revalidatePath(localizedPath(locale, "/blog"));
    if (slug) {
      revalidateTag(`blog:${slug}`, "max");
      revalidatePath(localizedPath(locale, `/blog/${slug}`));
    }
  }

  return NextResponse.json({ ok: true, slug });
}
