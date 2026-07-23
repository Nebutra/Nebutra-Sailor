import { buildAuthCenterSignInUrl } from "@nebutra/auth";
import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { rootRoute } from "./__root";

/**
 * Vite SPA does not run Next proxy — always send /sign-in to auth-center.
 */
function SignInRoute() {
  useEffect(() => {
    const appOrigin = window.location.origin;
    window.location.replace(buildAuthCenterSignInUrl(`${appOrigin}/dashboard`));
  }, []);

  return (
    <main className="grid min-h-[70vh] place-items-center bg-neutral-1 px-6 text-neutral-12">
      <p className="text-sm text-neutral-11">Redirecting to sign in…</p>
    </main>
  );
}

export const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInRoute,
});
