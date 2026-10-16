/**
 * API keys of the signed-in member's workspace. Owners and admins only. The
 * plaintext key is in the POST response and nowhere else, ever.
 */
import { z } from "zod";
import { API_KEY_SCOPES, canManageKeys, createApiKey, listApiKeys } from "@/server/auth";
import { getDb } from "@/server/db";
import { iso, json, problem, readJson, requireMember } from "@/server/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1),
});

function summary(k: Awaited<ReturnType<typeof listApiKeys>>[number]) {
  return {
    ...k,
    lastUsedAt: iso(k.lastUsedAt),
    revokedAt: iso(k.revokedAt),
    createdAt: iso(k.createdAt),
  };
}

export async function GET(request: Request) {
  const db = getDb();
  const member = await requireMember(db, request, canManageKeys);
  if (member instanceof Response) return member;
  return json({ keys: (await listApiKeys(db, member.workspaceId)).map(summary) });
}

export async function POST(request: Request) {
  const db = getDb();
  const member = await requireMember(db, request, canManageKeys);
  if (member instanceof Response) return member;
  const parsed = await readJson(request);
  if (!parsed.ok) return problem(400, "invalid_json");
  const body = bodySchema.safeParse(parsed.body);
  if (!body.success) return problem(422, "invalid_input", { issues: body.error.issues });
  const { key, apiKey } = await createApiKey(
    db,
    member.workspaceId,
    body.data.name,
    body.data.scopes,
  );
  return json({ key, apiKey: summary(apiKey) }, { status: 201 });
}
