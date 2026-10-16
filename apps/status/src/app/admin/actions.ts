"use server";

/**
 * Admin server actions. Each one authenticates through src/server/auth.ts,
 * checks the member's role and that the page is in their workspace, then
 * calls the same server functions the REST API uses.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { loadMessages } from "@/i18n/messages";
import { adminLocale, currentMember } from "@/lib/admin";
import {
  localizedMessage,
  localizedTitle,
  messageFieldName,
  titleFieldName,
} from "@/lib/admin-form";
import { invalidateSnapshot } from "@/lib/data";
import { pageLocales } from "@/lib/locale";
import {
  API_KEY_SCOPES,
  type ApiKeyScope,
  AuthError,
  canManageKeys,
  canWriteIncidents,
  createApiKey,
  revokeApiKey,
  SESSION_COOKIE,
  type SessionMember,
  signOut,
} from "@/server/auth";
import { getDb } from "@/server/db";
import { createIncident, IncidentError, updateIncident } from "@/server/incidents";

export interface ActionState {
  error?: { code: string; detail?: string };
  /** Shown once after creating an API key. */
  key?: string;
  ok?: boolean;
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function failure(error: unknown): ActionState {
  if (error instanceof AuthError) {
    return {
      error: { code: error.code, detail: error.message === error.code ? "" : error.message },
    };
  }
  if (error instanceof ZodError) {
    return {
      error: {
        code: "invalid_input",
        detail: error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "),
      },
    };
  }
  if (error instanceof IncidentError)
    return { error: { code: "invalid_input", detail: error.message } };
  throw error;
}

// ── Accounts ─────────────────────────────────────────────────────────────────
// Sign-in and setup go through /api/v1/auth/* (rate-limited there); only
// sign-out and the console language are actions.

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await signOut(getDb(), token);
  jar.delete(SESSION_COOKIE);
  redirect("/admin/sign-in");
}

// ── Incidents ────────────────────────────────────────────────────────────────

async function memberPage(
  allowed: (m: SessionMember) => boolean,
  pageSlug: string,
): Promise<
  | {
      member: SessionMember;
      page: { id: string; workspaceId: string; slug: string; locales: string[] };
    }
  | ActionState
> {
  const member = await currentMember();
  if (!member) redirect("/admin/sign-in");
  if (!allowed(member)) return { error: { code: "forbidden" } };
  const page = await getDb().page.findFirst({
    where: { slug: pageSlug, workspaceId: member.workspaceId },
    select: { id: true, workspaceId: true, slug: true, locales: true },
  });
  if (!page) return { error: { code: "not_found" } };
  return { member, page };
}

export async function createIncidentAction(_: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await memberPage(canWriteIncidents, text(form, "page"));
  if (!("page" in ctx)) return ctx;
  const { page } = ctx;
  const message = localizedMessage((n) => text(form, n), page.locales);
  if (!message) {
    return {
      error: {
        code: "invalid_input",
        detail: messageFieldName(pageLocales(page.locales)[0] ?? "en"),
      },
    };
  }
  const title = localizedTitle((n) => text(form, n), page.locales);
  if (!title) {
    return {
      error: {
        code: "invalid_input",
        detail: titleFieldName(pageLocales(page.locales)[0] ?? "en"),
      },
    };
  }
  const kind = text(form, "kind") === "maintenance" ? "maintenance" : "incident";
  let id: string;
  try {
    const created = await createIncident(getDb(), page, {
      kind,
      ...title,
      impact: text(form, "impact") as never,
      status: (kind === "maintenance"
        ? "identified"
        : text(form, "status") || "investigating") as never,
      ...message,
      components: form.getAll("components").filter((v): v is string => typeof v === "string"),
      ...(kind === "maintenance"
        ? { scheduledStart: text(form, "scheduledStart"), scheduledEnd: text(form, "scheduledEnd") }
        : {}),
    });
    id = created.id;
  } catch (error) {
    return failure(error);
  }
  invalidateSnapshot(page.slug);
  redirect(`/admin/incidents/${id}?page=${page.slug}`);
}

export async function updateIncidentAction(_: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await memberPage(canWriteIncidents, text(form, "page"));
  if (!("page" in ctx)) return ctx;
  const { page } = ctx;
  const id = text(form, "id");
  let message = localizedMessage((n) => text(form, n), page.locales);
  const status = text(form, "status");
  if (text(form, "intent") === "resolve") {
    // A standard closing line in every language the page publishes.
    const kind = text(form, "kind");
    const entries = await Promise.all(
      pageLocales(page.locales).map(async (l) => {
        const m = (await loadMessages(l)).admin.update;
        return [l, kind === "maintenance" ? m.maintenanceDone : m.resolvedMessage] as const;
      }),
    );
    const [first, ...rest] = entries;
    message = {
      message: first?.[1] ?? "Resolved.",
      ...(rest.length > 0 ? { messageI18n: Object.fromEntries(rest) } : {}),
    };
  }
  if (!message)
    return { error: { code: "invalid_input", detail: messageFieldName(await adminLocale()) } };
  try {
    const row = await updateIncident(getDb(), page.id, id, {
      status: (text(form, "intent") === "resolve" ? "resolved" : status) as never,
      ...message,
    });
    if (!row) return { error: { code: "not_found" } };
  } catch (error) {
    return failure(error);
  }
  invalidateSnapshot(page.slug);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ── API keys ─────────────────────────────────────────────────────────────────

export async function createKeyAction(_: ActionState, form: FormData): Promise<ActionState> {
  const member = await currentMember();
  if (!member) redirect("/admin/sign-in");
  if (!canManageKeys(member)) return { error: { code: "forbidden" } };
  const scopes = form
    .getAll("scopes")
    .filter((s): s is ApiKeyScope => (API_KEY_SCOPES as readonly unknown[]).includes(s));
  try {
    const { key } = await createApiKey(getDb(), member.workspaceId, text(form, "name"), scopes);
    revalidatePath("/admin/keys");
    return { ok: true, key };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeKeyAction(_: ActionState, form: FormData): Promise<ActionState> {
  const member = await currentMember();
  if (!member) redirect("/admin/sign-in");
  if (!canManageKeys(member)) return { error: { code: "forbidden" } };
  const revoked = await revokeApiKey(getDb(), member.workspaceId, text(form, "id"));
  revalidatePath("/admin/keys");
  return revoked ? { ok: true } : { error: { code: "not_found" } };
}
