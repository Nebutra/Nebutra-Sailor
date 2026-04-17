import Link from "next/link";

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {"{PRODUCT_NAME}"} Documentation
      </h1>
      <p className="max-w-xl text-lg text-fd-muted-foreground">
        Build AI-native SaaS products faster. Everything you need to ship is documented here.
      </p>
      <Link
        href="/docs"
        className="rounded-md bg-fd-primary px-6 py-3 font-semibold text-fd-primary-foreground transition-opacity hover:opacity-90"
      >
        Read the docs
      </Link>
    </main>
  );
}
