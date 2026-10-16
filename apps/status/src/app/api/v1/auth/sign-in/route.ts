/** Email + password sign-in; sets the `ns_session` cookie. */
import { z } from "zod";
import { sessionCookie, signIn } from "@/server/auth";
import { getDb } from "@/server/db";
import { json, problem, readJson } from "@/server/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (!parsed.ok) return problem(400, "invalid_json");
  const body = bodySchema.safeParse(parsed.body);
  if (!body.success) return problem(422, "invalid_input");
  const session = await signIn(getDb(), body.data.email, body.data.password);
  if (!session) return problem(401, "invalid_credentials");
  return json(
    { member: session.member },
    { headers: { "set-cookie": sessionCookie(session.token, session.expiresAt) } },
  );
}
