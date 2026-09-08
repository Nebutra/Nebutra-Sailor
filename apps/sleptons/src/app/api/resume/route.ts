import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getMemberIdForUser, getResumeForMember, upsertResume } from "@/lib/resume";

export const dynamic = "force-dynamic";

type Resolved = { ok: true; memberId: string } | { ok: false; response: NextResponse };

async function resolveMember(): Promise<Resolved> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const memberId = await getMemberIdForUser(userId);
  if (!memberId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No Sleptons membership" }, { status: 403 }),
    };
  }
  return { ok: true, memberId };
}

/** Owner read. Public reads go through the member page, not this route. */
export async function GET(): Promise<NextResponse> {
  const r = await resolveMember();
  if (!r.ok) return r.response;
  const resume = await getResumeForMember(r.memberId);
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ resume });
}

/** Full-document upsert. Body: ResumeWriteSchema. */
export async function PUT(req: Request): Promise<NextResponse> {
  const r = await resolveMember();
  if (!r.ok) return r.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const resume = await upsertResume(r.memberId, body);
    if (!resume) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    return NextResponse.json({ resume });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid résumé", issues: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: "Failed to save résumé" }, { status: 500 });
  }
}
