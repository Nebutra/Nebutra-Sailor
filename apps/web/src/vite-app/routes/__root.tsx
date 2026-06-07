import { useAuthContext } from "@nebutra/auth/react/context";
import { brand } from "@nebutra/brand/metadata";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Link, Outlet, useLocation } from "@tanstack/react-router";

const appNav = [
  { to: "/startup-os", label: "Startup OS" },
  { to: "/settings", label: "Settings" },
  { to: "/billing", label: "Billing" },
] as const;

function ProductShell() {
  const location = useLocation();
  const { isLoaded, isSignedIn, user, signOut } = useAuthContext();
  const isAuthRoute = location.pathname === "/sign-in";

  if (!isLoaded) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-1 text-neutral-12">
        <p className="text-sm text-neutral-11">Loading session...</p>
      </main>
    );
  }

  if (!isSignedIn && !isAuthRoute) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-1 px-6 text-neutral-12">
        <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-2 p-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-10">
            Product App
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Sign in to continue</h1>
          <p className="mt-2 text-sm text-neutral-11">
            Authentication stays behind the existing provider-agnostic {brand.name} auth facade.
          </p>
          <a
            className="mt-5 inline-flex rounded-[var(--radius-md)] bg-neutral-12 px-4 py-2 text-sm font-medium text-neutral-1"
            href="/sign-in"
          >
            Continue
          </a>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-1 text-neutral-12">
      <header className="sticky top-0 z-30 border-neutral-7 border-b bg-neutral-1/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <Link
            to="/startup-os"
            className="inline-flex h-8 items-center"
            aria-label="Open product home"
          >
            <img
              src="/brand/logo-horizontal-en.svg"
              alt={brand.name}
              className="h-5 w-auto"
              draggable={false}
            />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Product">
            {appNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ "aria-current": "page" }}
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-neutral-11 transition hover:bg-neutral-3 hover:text-neutral-12 [&[aria-current=page]]:bg-neutral-3 [&[aria-current=page]]:text-neutral-12"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm text-neutral-11">
            <span className="hidden max-w-[12rem] truncate sm:inline">
              {user?.name ?? user?.email ?? "Account"}
            </span>
            <button
              type="button"
              className="rounded-[var(--radius-sm)] border border-neutral-7 px-3 py-1.5 text-neutral-12"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: ProductShell,
});
