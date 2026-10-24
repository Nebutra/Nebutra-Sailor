/** Ends the current session and clears its cookie. */
import { clearSessionCookie, sessionTokenFromCookie, signOut } from "@/server/auth";
import { getDb } from "@/server/db";
import { json } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = sessionTokenFromCookie(request.headers.get("cookie"));
  if (token) await signOut(getDb(), token);
  return json({ signedOut: true }, { headers: { "set-cookie": clearSessionCookie() } });
}
