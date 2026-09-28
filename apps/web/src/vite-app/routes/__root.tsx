import { useAuthContext } from "@nebutra/auth/react/context";
import { BrandMark, BrandWordmark } from "@nebutra/brand";
import { Button } from "@nebutra/ui/primitives";
import { createRootRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/navigation/sidebar-context";
import { APP_HOME, APP_NAV, AppDevtools } from "@/vite-app/app-shell";

/**
 * Routes that render for signed-out visitors, outside the product shell. "/"
 * only redirects; the page it lands on applies its own rule.
 */
const PUBLIC_ROUTES = new Set(["/", "/sign-in", "/welcome"]);

function ProductShell() {
  const location = useLocation();
  const { isLoaded, isSignedIn, user, signOut } = useAuthContext();
  const isPublicRoute = PUBLIC_ROUTES.has(location.pathname);

  if (!isLoaded) {
    return (
      <main className="grid min-h-dvh place-items-center bg-neutral-1 text-neutral-12">
        <p className="text-sm text-neutral-11">Loading…</p>
      </main>
    );
  }

  if (!isSignedIn && isPublicRoute) {
    return (
      <div className="min-h-dvh bg-neutral-1 text-neutral-12">
        <Outlet />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="grid min-h-dvh place-items-center bg-neutral-1 px-6 text-neutral-12">
        <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-2 p-6">
          <h1 className="text-2xl font-semibold">Sign in to continue</h1>
          <p className="mt-2 text-sm text-neutral-11">
            Your session has ended, or you haven't signed in on this device.
          </p>
          <Button asChild variant="ink" className="mt-5">
            <a href="/sign-in">Sign in</a>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-dvh bg-neutral-1 text-neutral-12">
        <header className="sticky top-0 z-30 border-neutral-7 border-b bg-neutral-1/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-wide items-center justify-between px-4">
            <Link to={APP_HOME} className="inline-flex h-8 items-center" aria-label="Home">
              <span className="inline-flex items-center gap-2 text-neutral-12">
                <BrandMark size={20} />
                <BrandWordmark height={16} />
              </span>
            </Link>
            <nav className="flex items-center gap-1" aria-label="Product">
              {APP_NAV.map((item) => (
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
              <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-wide px-4 py-6">
          <Outlet />
        </main>
        <AppDevtools />
      </div>
    </SidebarProvider>
  );
}

export const rootRoute = createRootRoute({
  component: ProductShell,
});
