/** Read-only lookups for the subscription landing pages. Server only. */
import { getDb } from "@/server/db";

export async function subscriberPage(
  token: string,
): Promise<{ slug: string; title: string; locales: string[]; logoUrl: string | null } | null> {
  if (!token) return null;
  const row = await getDb().subscriber.findUnique({
    where: { token },
    select: { page: { select: { slug: true, title: true, locales: true, logoUrl: true } } },
  });
  return row?.page ?? null;
}
