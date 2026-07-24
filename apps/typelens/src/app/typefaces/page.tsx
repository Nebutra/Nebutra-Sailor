import Link from "next/link";
import { listTypefaces } from "@/lib/catalog";
export const metadata = { title: "Typefaces" };
export default function TypefacesPage() {
  const typefaces = listTypefaces();
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-8">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Typefaces</h1>
      <p className="mt-3 max-w-2xl text-neutral-600">Free commercial-use faces only (v0).</p>
      <ul className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
        {typefaces.map((tf) => (
          <li key={tf.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
            <div>
              <Link
                href={`/typefaces/${tf.id}`}
                className="text-2xl font-semibold no-underline hover:underline"
                style={{ fontFamily: tf.cssStack }}
              >
                {tf.family}
              </Link>
              <p className="mt-1 text-sm text-neutral-500">
                {tf.foundry} · {tf.category} · {tf.scripts.join(", ")}
              </p>
            </div>
            <span className="rounded-full border border-emerald-700/40 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
              {tf.license.spdxOrLabel} · commercial OK
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
