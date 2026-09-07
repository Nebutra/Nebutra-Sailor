import { auth } from "@clerk/nextjs/server";
import type { ResumeContentV1Input } from "@nebutra/contracts/sleptons";
import Link from "next/link";
import { ResumeEditor } from "@/features/resume/editor/ResumeEditor";
import { emptyContent } from "@/features/resume/editor/state";
import { getMemberIdForUser, getResumeForMember } from "@/lib/resume";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit résumé — Sleptons" };

export default async function ResumeEditPage() {
  const { userId } = await auth();
  if (!userId) {
    // proxy.ts redirects unauthenticated users before we get here; this is the belt.
    return <Gate>Sign in to edit your résumé.</Gate>;
  }
  const memberId = await getMemberIdForUser(userId);
  if (!memberId) {
    return (
      <Gate>
        Your account has no Sleptons membership yet.{" "}
        <Link href="/" className="underline">
          Back to the gallery
        </Link>
      </Gate>
    );
  }
  const existing = await getResumeForMember(memberId);
  const initial = (existing?.content as ResumeContentV1Input | undefined) ?? emptyContent();

  return <ResumeEditor initial={initial} />;
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center text-muted-foreground">
      {children}
    </main>
  );
}
