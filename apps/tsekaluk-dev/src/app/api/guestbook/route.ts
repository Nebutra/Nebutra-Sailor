import { Resend } from "resend";
import { z } from "zod";
import { auth } from "@/auth";
import { escapeHtml } from "@/lib/escape-html";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const checkRateLimit = createRateLimiter(60_000, 3);

const guestbookPostSchema = z.object({
  message: z.string().min(1).max(280),
  nickname: z.string().min(1).max(100),
  relationship: z.enum([
    "friend",
    "colleague",
    "client",
    "partner",
    "classmate",
    "mentor",
    "fan",
    "other",
  ]),
  company: z.string().max(100).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

const guestbookPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

function isAdmin(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail && email?.toLowerCase() === adminEmail.toLowerCase());
}

async function notifyAdmin(entry: {
  nickname: string;
  relationship: string;
  message: string;
  company?: string | null;
  title?: string | null;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@tsekaluk.dev";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tsekaluk.dev";

  if (!adminEmail || !resendKey) return;

  const resend = new Resend(resendKey);

  await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: `New endorsement from ${entry.nickname}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="font-size:18px;margin-bottom:16px">New endorsement pending review</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px">From</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600">${escapeHtml(entry.nickname)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Relationship</td>
            <td style="padding:8px 0;font-size:14px">${escapeHtml(entry.relationship)}${
              entry.company || entry.title
                ? ` (${[entry.title, entry.company]
                    .filter(Boolean)
                    .map((s) => escapeHtml(String(s)))
                    .join(" @ ")})`
                : ""
            }</td>
          </tr>
        </table>
        <blockquote style="border-left:3px solid #e5e7eb;margin:0 0 24px;padding:12px 16px;color:#374151;font-style:italic;font-size:15px">
          ${escapeHtml(entry.message)}
        </blockquote>
        <a href="${siteUrl}/admin/guestbook" style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">
          Review in admin panel →
        </a>
      </div>
    `,
  });
}

const DB_UNAVAILABLE = Response.json(
  { success: false, error: "Database not configured" },
  { status: 503 },
);

// GET: public read (approved only) or admin read (all)
export async function GET(req: Request) {
  if (!prisma) return DB_UNAVAILABLE;
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");

    if (all === "true") {
      const session = await auth();
      if (!session?.user || !isAdmin(session.user.email)) {
        return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
      }

      const data = await prisma.guestbook.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return Response.json({ success: true, data });
    }

    const data = await prisma.guestbook.findMany({
      where: { status: "approved" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        authorName: true,
        authorImage: true,
        nickname: true,
        relationship: true,
        company: true,
        title: true,
        message: true,
        createdAt: true,
      },
    });

    return Response.json({ success: true, data });
  } catch (_err) {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST: anyone can submit — authenticated users are auto-approved, others go to pending
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

    const session = await auth();

    const body = await req.json();
    const parsed = guestbookPostSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { message, nickname, relationship, company, title, avatar_url } = parsed.data;
    const trimmed = message.trim();

    const isAuthenticated = Boolean(session?.user);
    const status = isAuthenticated ? "approved" : "pending";
    const authorName = session?.user?.name ?? nickname.trim();
    const authorImage = avatar_url ?? (isAuthenticated ? (session?.user?.image ?? null) : null);
    const authorProvider = isAuthenticated ? "oauth" : "anonymous";

    const data = await prisma.guestbook.create({
      data: {
        authorName,
        authorImage,
        authorProvider,
        nickname: nickname.trim(),
        relationship,
        company: company?.trim() || null,
        title: title?.trim() || null,
        message: trimmed,
        status,
      },
    });

    // Notify admin for submissions that need review
    if (status === "pending") {
      notifyAdmin({
        nickname: nickname.trim(),
        relationship,
        company: company?.trim(),
        title: title?.trim(),
        message: trimmed,
      }).catch((_err: unknown) => {});
    }

    return Response.json({ success: true, data }, { status: 201 });
  } catch (_err) {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: admin approve/reject
export async function PATCH(req: Request) {
  if (!prisma) return DB_UNAVAILABLE;
  try {
    const session = await auth();

    if (!session?.user) {
      return Response.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    if (!isAdmin(session.user.email)) {
      return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > 4 * 1024) {
      return Response.json({ success: false, error: "Payload too large" }, { status: 413 });
    }

    const body = await req.json();
    const parsed = guestbookPatchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { id, status } = parsed.data;
    await prisma.guestbook.update({
      where: { id },
      data: { status },
    });

    return Response.json({ success: true });
  } catch (_err) {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: admin delete
export async function DELETE(req: Request) {
  if (!prisma) return DB_UNAVAILABLE;
  try {
    const session = await auth();

    if (!session?.user) {
      return Response.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    if (!isAdmin(session.user.email)) {
      return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ success: false, error: "Entry ID is required" }, { status: 400 });
    }

    if (!z.string().uuid().safeParse(id).success) {
      return Response.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    await prisma.guestbook.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (_err) {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
