import Link from "next/link";
import { notFound } from "next/navigation";
import { getTypeface, listSpecimens, listWorks } from "@/lib/catalog";

type Params = Promise<{ id: string }>;
export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  return { title: getTypeface(id)?.family ?? "Typeface" };
}
export default async function TypefaceDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const tf = getTypeface(id);
  if (!tf) notFound();
  const workById = new Map(listWorks().map((w) => [w.id, w]));
  const usedIn = listSpecimens().filter((s) => s.typefaces.some((r) => r.typefaceId === tf.id));
  return (
    <article
      data-tl-section
      className="mx-auto w-full max-w-[900px] px-5 py-12 sm:px-6 md:px-8 md:py-16 will-change-transform"
    >
      <p className="mb-2 text-sm text-neutral-500">
        <Link href="/typefaces" className="hover:underline">
          Typefaces
        </Link>
      </p>
      <h1
        className="text-5xl font-bold tracking-tight md:text-6xl"
        style={{ fontFamily: tf.cssStack }}
      >
        {tf.family}
      </h1>
      <p className="mt-3 text-neutral-600">
        {tf.foundry} · {tf.category}
      </p>
      <p className="mt-2 text-sm">
        License:{" "}
        <a href={tf.license.licenseUrl} className="underline" target="_blank" rel="noreferrer">
          {tf.license.spdxOrLabel}
        </a>{" "}
        · commercial OK
      </p>
      <div
        className="mt-8 border border-neutral-200 bg-neutral-50 p-8 text-3xl leading-snug"
        style={{ fontFamily: tf.cssStack }}
      >
        The quick brown fox jumps over the lazy dog.
        <br />
        永和九年 字体搭配 范例库
      </div>
      <h2 className="mt-12 text-2xl font-bold">Used in</h2>
      <ul className="mt-4 space-y-3">
        {usedIn.map((s) => {
          const work = workById.get(s.workId);
          if (!work) return null;
          const roles = s.typefaces
            .filter((r) => r.typefaceId === tf.id)
            .map((r) => r.role)
            .join(", ");
          return (
            <li key={s.id}>
              <Link href={`/works/${work.slug}`} className="text-lg font-medium hover:underline">
                {work.title}
              </Link>
              <span className="text-sm text-neutral-500"> · {roles}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
