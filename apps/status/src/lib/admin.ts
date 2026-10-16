/**
 * Admin console plumbing: who is signed in, which page they are working on,
 * and which language the console speaks. Server only. Authentication itself
 * is the backend's (src/server/auth.ts); this only reads the cookie it sets.
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSessionMember,
  SESSION_COOKIE,
  type SessionMember,
  setupAvailable,
} from "@/server/auth";
import { getDb } from "@/server/db";
import { type AppLocale, LOCALE_COOKIE, resolveLocale } from "./locale";

export async function currentMember(): Promise<SessionMember | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionMember(getDb(), token);
}

/** The signed-in member, or a redirect to setup (fresh instance) or sign-in. */
export async function requireMember(): Promise<SessionMember> {
  const member = await currentMember();
  if (member) return member;
  if (await setupAvailable(getDb())) redirect("/admin/setup");
  redirect("/admin/sign-in");
}

export async function adminLocale(): Promise<AppLocale> {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  // One language choice for the whole instance: the same cookie the public pages use.
  return resolveLocale({
    cookie: jar.get(LOCALE_COOKIE)?.value,
    acceptLanguage: h.get("accept-language"),
    locales: ["zh-CN", "en"],
  });
}

export interface AdminPage {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  locales: string[];
}

export async function workspacePages(workspaceId: string): Promise<AdminPage[]> {
  return getDb().page.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true, workspaceId: true, slug: true, title: true, locales: true },
  });
}

/** The page named by `?page=`, else the workspace's first. */
export function pickPage(
  pages: AdminPage[],
  slug: string | string[] | undefined,
): AdminPage | null {
  const wanted = Array.isArray(slug) ? slug[0] : slug;
  return pages.find((p) => p.slug === wanted) ?? pages[0] ?? null;
}
