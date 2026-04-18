import { Suspense } from "react";
import { MemberCard } from "@/components/MemberCard";
import { WelcomeOverlayShell } from "@/components/WelcomeOverlayShell";
import { getPublicMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    welcome?: string;
    page?: string;
    tier?: string;
    lookingFor?: string;
  }>;
}

export default async function CommunityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isWelcome = params.welcome === "true";
  const page = Number(params.page ?? "1");

  const { members, total } = await getPublicMembers({
    page,
    tier: params.tier,
    lookingFor: params.lookingFor,
  });

  return (
    <>
      {isWelcome && <WelcomeOverlayShell />}

      <main className="mx-auto max-w-[1400px] px-4 py-12 md:px-6">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-5xl font-bold tracking-tight text-[var(--neutral-12)]">
            SLEPTONS
          </h1>
          <p className="mb-6 text-lg text-[var(--neutral-11)]">
            AI-native founders. One person. Infinite potential.
          </p>
          <div className="flex justify-center gap-8 text-sm text-[var(--neutral-11)]">
            <span>
              <strong className="text-[var(--neutral-12)]">{total}</strong> founders
            </span>
          </div>
        </div>

        <Suspense fallback={<div className="text-center text-[var(--neutral-11)]">Loading...</div>}>
          {members.length === 0 ? (
            <div className="py-24 text-center text-[var(--neutral-11)]">
              No members found. Be the first →
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member as Parameters<typeof MemberCard>[0]["member"]}
                />
              ))}
            </div>
          )}
        </Suspense>
      </main>
    </>
  );
}
