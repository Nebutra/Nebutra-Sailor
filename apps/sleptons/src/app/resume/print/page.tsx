import { auth } from "@clerk/nextjs/server";
import { ResumeContentV1Schema } from "@nebutra/contracts/sleptons";
import Link from "next/link";
import { PrintToolbar } from "@/features/resume/render/PrintToolbar";
import { ResumeDocument } from "@/features/resume/render/ResumeDocument";
import { getMemberIdForUser, getResumeForMember } from "@/lib/resume";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print résumé — Sleptons" };

const PAPER_SIZE = { A4: "210mm 297mm", Letter: "216mm 279mm" } as const;

/**
 * Owner-only print view. Browser print → PDF for now; the server-side
 * Playwright export (R2) renders this same route.
 */
export default async function ResumePrintPage() {
  const { userId } = await auth();
  const memberId = userId ? await getMemberIdForUser(userId) : null;
  const existing = memberId ? await getResumeForMember(memberId) : null;
  const parsed = existing ? ResumeContentV1Schema.safeParse(existing.content) : null;

  if (!parsed?.success) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center text-muted-foreground">
        Nothing to print yet.{" "}
        <Link href="/resume/edit" className="underline">
          Open the editor
        </Link>
      </main>
    );
  }

  const { paper, margins } = parsed.data.preferences;

  return (
    <>
      <style>{`@page { size: ${PAPER_SIZE[paper]}; margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left}; }
@media print { body { background: white; } [data-print-toolbar] { display: none; } [data-resume-mode="print"] { padding: 0 !important; min-height: 0 !important; width: auto !important; } }`}</style>
      <PrintToolbar />
      <main className="bg-muted/30 py-8 print:bg-white print:py-0">
        <div className="mx-auto w-fit shadow-md print:shadow-none">
          <ResumeDocument content={parsed.data} mode="print" />
        </div>
      </main>
    </>
  );
}
