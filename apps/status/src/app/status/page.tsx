/** `/status` is the same page as `/` — the path existing deployments already link to. */
import type { Metadata } from "next";
import { HomeRoute, pageMetadata } from "@/components/routes";
import { getSnapshot, homeTarget } from "@/lib/data";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const target = await homeTarget();
  if (target.kind !== "page") return {};
  return pageMetadata(await getSnapshot(target.slug), (await searchParams).lang);
}

export default async function StatusAlias({ searchParams }: Props) {
  return <HomeRoute query={await searchParams} path="/status" />;
}
