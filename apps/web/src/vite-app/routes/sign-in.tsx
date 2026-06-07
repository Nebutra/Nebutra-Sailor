import { brand } from "@nebutra/brand/metadata";
import { createRoute } from "@tanstack/react-router";
import { resolveApiUrl } from "@/lib/api/browser-client";
import { rootRoute } from "./__root";

function SignInRoute() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-neutral-1 px-6 text-neutral-12">
      <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-2 p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-10">
          Product App
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Sign in to continue</h1>
        <p className="mt-2 text-sm text-neutral-11">
          Authentication is handled by the existing {brand.name} auth facade.
        </p>
        <a
          className="mt-5 inline-flex rounded-[var(--radius-md)] bg-neutral-12 px-4 py-2 text-sm font-medium text-neutral-1"
          href={resolveApiUrl("/api/auth/sign-in")}
        >
          Continue
        </a>
      </section>
    </main>
  );
}

export const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInRoute,
});
