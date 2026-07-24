import Link from "next/link";
import { extractSpecimen, listSpecimens } from "@/lib/catalog";
export const metadata = { title: "For Agents" };
export default function AgentsDocsPage() {
  const sampleId = listSpecimens()[0]?.id ?? "spec-calm-saas-landing";
  let sample: unknown = null;
  try {
    sample = extractSpecimen(sampleId);
  } catch {
    sample = { error: "sample unavailable" };
  }
  return (
    <article className="mx-auto max-w-[800px] px-4 py-10 md:px-8">
      <h1 className="text-4xl font-bold tracking-tight">For Agents</h1>
      <p className="mt-3 text-neutral-600">
        Structured pairings with commercial-use licenses for design agents.
      </p>
      <h2 className="mt-10 text-2xl font-bold">Package</h2>
      <pre className="mt-3 overflow-auto rounded bg-neutral-900 p-4 text-sm text-neutral-100">{`import { searchSpecimens, extractSpecimen } from "@nebutra/typelens-catalog";`}</pre>
      <h2 className="mt-10 text-2xl font-bold">Sample extract</h2>
      <p className="mt-2 text-sm text-neutral-500">
        <Link href="/works/calm-saas-landing" className="underline">
          {sampleId}
        </Link>
      </p>
      <pre className="mt-3 max-h-96 overflow-auto rounded bg-neutral-900 p-4 text-xs text-neutral-100">
        {JSON.stringify(sample, null, 2)}
      </pre>
    </article>
  );
}
