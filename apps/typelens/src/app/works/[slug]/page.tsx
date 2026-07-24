import Link from "next/link";
import { notFound } from "next/navigation";
import {
  extractSpecimen,
  getSpecimenForWork,
  getTypeface,
  getWork,
  mediumLabel,
} from "@/lib/catalog";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  return { title: getWork(slug)?.title ?? "Work" };
}

export default async function WorkDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work || work.status !== "published") notFound();
  const specimen = getSpecimenForWork(work.id);
  const extract = specimen ? extractSpecimen(specimen.id) : null;

  return (
    <article className="mx-auto max-w-[900px] px-4 py-10 md:px-8">
      <p className="mb-2 text-sm text-neutral-500">
        <Link href="/works" className="hover:underline">
          Works
        </Link>
        <span className="mx-2">/</span>
        {mediumLabel(work.medium)}
      </p>
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{work.title}</h1>
      {work.titleZh ? <p className="mt-2 text-xl text-neutral-600">{work.titleZh}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {work.mood.map((m) => (
          <Link
            key={m}
            href={`/works?mood=${m}`}
            className="rounded-full border border-neutral-300 px-3 py-0.5 text-xs font-medium no-underline hover:border-neutral-900"
          >
            {m}
          </Link>
        ))}
      </div>
      <div className="mt-8 aspect-[16/10] border border-neutral-200 bg-neutral-50 p-8">
        <div className="flex h-full flex-col justify-center gap-4">
          {extract
            ? Object.entries(extract.pairing).map(([role, p]) => (
                <p
                  key={role}
                  className="leading-tight"
                  style={{
                    fontFamily: p.cssStack,
                    fontSize: role === "display" ? "2.5rem" : "1.125rem",
                    fontWeight: p.weight ?? 400,
                  }}
                >
                  {role}: {p.family}
                </p>
              ))
            : null}
        </div>
      </div>
      {specimen ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Type system</h2>
          <p className="text-neutral-700">{specimen.summary}</p>
          {specimen.summaryZh ? <p className="text-neutral-600">{specimen.summaryZh}</p> : null}
          <p className="text-sm text-neutral-500">Pairing: {specimen.pairing.strategy}</p>
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {specimen.typefaces.map((ref) => {
              const tf = getTypeface(ref.typefaceId);
              if (!tf) return null;
              return (
                <li
                  key={`${ref.typefaceId}-${ref.role}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                >
                  <Link
                    href={`/typefaces/${tf.id}`}
                    className="text-lg font-medium hover:underline"
                    style={{ fontFamily: tf.cssStack }}
                  >
                    {tf.family}
                  </Link>
                  <span className="text-sm text-neutral-500">
                    {ref.role} · {tf.license.spdxOrLabel}
                  </span>
                </li>
              );
            })}
          </ul>
          <h3 className="pt-4 text-lg font-semibold">Hierarchy</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-neutral-500">
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Weight</th>
                <th className="py-2">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {specimen.hierarchy.map((step) => (
                <tr key={`${step.role}-${step.rem}`} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-medium">{step.role}</td>
                  <td className="py-2 pr-4">{step.rem}rem</td>
                  <td className="py-2 pr-4">{step.weight}</td>
                  <td className="py-2">{step.tracking ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {extract ? (
        <section className="mt-10 rounded border border-neutral-900 bg-neutral-50 p-6">
          <h2 className="text-xl font-bold">Agent extract</h2>
          <p className="mt-1 text-sm text-neutral-600">
            schema v{extract.schemaVersion} · confidence {(extract.confidence * 100).toFixed(0)}%
          </p>
          <pre className="mt-4 max-h-80 overflow-auto rounded bg-neutral-900 p-4 text-xs text-neutral-100">
            {JSON.stringify(extract, null, 2)}
          </pre>
          <p className="mt-3 text-sm">
            <Link href="/docs/agents" className="underline">
              Agent docs →
            </Link>
          </p>
        </section>
      ) : null}
    </article>
  );
}
