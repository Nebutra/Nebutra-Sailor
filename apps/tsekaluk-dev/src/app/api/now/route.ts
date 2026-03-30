import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const checkRateLimit = createRateLimiter(60_000, 30);

function isAdmin(email: string | null | undefined): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL && email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase(),
  );
}

const nowEntrySchema = z.object({
  date: z.string().min(1),
  building: z.array(z.string()).default([]),
  thinking: z.array(z.string()).default([]),
  shipped: z.array(z.string()).default([]),
  reading: z.array(z.string()).default([]),
});

const nowPatchSchema = z.object({
  id: z.string().uuid(),
  date: z.string().min(1).optional(),
  building: z.array(z.string()).optional(),
  thinking: z.array(z.string()).optional(),
  shipped: z.array(z.string()).optional(),
  reading: z.array(z.string()).optional(),
});

const DB_UNAVAILABLE = Response.json(
  { success: false, error: "Database not configured" },
  { status: 503 },
);

export async function GET(req: Request) {
  if (!prisma) return DB_UNAVAILABLE;
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return Response.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  try {
    const entry = await prisma.nowEntry.findFirst({
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ success: true, data: entry });
  } catch (_err) {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!prisma) return DB_UNAVAILABLE;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user || !isAdmin(session.user.email)) {
      return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > 64 * 1024) {
      return Response.json({ success: false, error: "Payload too large" }, { status: 413 });
    }

    const body = await req.json();
    const parsed = nowEntrySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const entry = await prisma.nowEntry.create({ data: parsed.data });
    return Response.json({ success: true, data: entry }, { status: 201 });
  } catch (_err) {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!prisma) return DB_UNAVAILABLE;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user || !isAdmin(session.user.email)) {
      return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > 64 * 1024) {
      return Response.json({ success: false, error: "Payload too large" }, { status: 413 });
    }

    const body = await req.json();
    const parsed = nowPatchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { id, ...data } = parsed.data;
    const entry = await prisma.nowEntry.update({ where: { id }, data });
    return Response.json({ success: true, data: entry });
  } catch (_err) {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
