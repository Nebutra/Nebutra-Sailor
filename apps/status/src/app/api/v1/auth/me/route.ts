/** The signed-in member, or 401. */
import { getSessionMember } from "@/server/auth";
import { getDb } from "@/server/db";
import { json, problem } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const member = await getSessionMember(getDb(), request.headers.get("cookie"));
  return member ? json({ member }) : problem(401, "unauthorized");
}
