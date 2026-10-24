/** Revoke an API key of the signed-in member's workspace. */
import { canManageKeys, revokeApiKey } from "@/server/auth";
import { getDb } from "@/server/db";
import { json, problem, type RouteContext, requireMember } from "@/server/http";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: RouteContext<{ id: string }>) {
  const { id } = await context.params;
  const db = getDb();
  const member = await requireMember(db, request, canManageKeys);
  if (member instanceof Response) return member;
  const revoked = await revokeApiKey(db, member.workspaceId, id);
  return revoked ? json({ revoked: true }) : problem(404, "key_not_found");
}
