import { headers } from "next/headers";
import { Resend } from "resend";
import { z } from "zod";
import { auth } from "@/auth";
import { escapeHtml } from "@/lib/escape-html";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const RATING_LABELS: Record<string, string> = {
  love: "Love It 😍",
  okay: "It's Okay 😐",
  bad: "Not Great 😕",
  hate: "Hate 😤",
};

const feedbackSchema = z
  .object({
    rating: z.enum(["love", "okay", "bad", "hate"]).optional(),
    message: z.string().max(500).optional(),
  })
  .refine((data) => data.rating !== undefined || (data.message?.trim().length ?? 0) > 0, {
    message: "Either rating or message is required",
  });

const checkRateLimit = createRateLimiter(60_000, 5);

function isAdmin(email: string | null | undefined) {
  return Boolean(
    process.env.ADMIN_EMAIL && email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase(),
  );
}

const DB_UNAVAILABLE = Response.json(
  { success: false, error: "Database not configured" },
  { status: 503 },
);

export async function GET() {
  if (!prisma) return DB_UNAVAILABLE;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isAdmin(session.user.email)) {
      return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const data = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return Response.json({ success: true, data });
  } catch (_err) {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!prisma) return DB_UNAVAILABLE;
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      return Response.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > 16 * 1024) {
      return Response.json({ success: false, error: "Payload too large" }, { status: 413 });
    }

    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { rating, message } = parsed.data;

    await prisma.feedback.create({
      data: { rating: rating ?? null, message: message?.trim() ?? null },
    });

    const adminEmail = process.env.ADMIN_EMAIL;
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@tsekaluk.dev";

    if (adminEmail && resendKey) {
      const resend = new Resend(resendKey);
      const ratingLabel = rating ? (RATING_LABELS[rating] ?? null) : null;

      await resend.emails
        .send({
          from: fromEmail,
          to: adminEmail,
          subject: `Portfolio feedback${ratingLabel ? `: ${ratingLabel}` : ""}`,
          html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="font-size:18px;margin-bottom:16px">Portfolio feedback</h2>
            ${ratingLabel ? `<p style="font-size:20px;margin-bottom:16px">${ratingLabel}</p>` : ""}
            ${
              message?.trim()
                ? `
              <blockquote style="border-left:3px solid #e5e7eb;margin:0 0 16px;padding:12px 16px;color:#374151;font-size:15px">
                ${escapeHtml(message.trim())}
              </blockquote>
            `
                : ""
            }
            <p style="color:#9ca3af;font-size:12px">From tsekaluk.dev</p>
          </div>
        `,
        })
        .catch((_err: unknown) => {});
    }

    return Response.json({ success: true });
  } catch (_err) {
    return Response.json({ success: false, error: "Failed to send feedback" }, { status: 500 });
  }
}
