import { useLocation, useNavigate, useRouter as useTanStackRouter } from "@tanstack/react-router";
import { useMemo } from "react";

export function usePathname() {
  return useLocation({ select: (location) => location.pathname });
}

export function useSearchParams() {
  const searchStr = useLocation({ select: (location) => location.searchStr });
  return useMemo(() => new URLSearchParams(searchStr), [searchStr]);
}

export function useRouter() {
  const navigate = useNavigate();
  const router = useTanStackRouter();

  return {
    push: (href: string) => void navigate({ to: href }),
    replace: (href: string) => void navigate({ to: href, replace: true }),
    /**
     * Next's `router.refresh()` re-fetches server data for the current route
     * without losing client state. The Vite analogue is re-running the
     * matched routes' loaders in place — never a page load, which would drop
     * scroll, focus and every client cache. Query-cache data is refreshed by
     * `useRevalidate()` (`@/lib/navigation/use-revalidate`), which calls this.
     */
    refresh: () => void router.invalidate(),
    back: () => router.history.back(),
    forward: () => router.history.forward(),
    prefetch: async (href: string) => {
      await router.preloadRoute({ to: href }).catch(() => undefined);
    },
  };
}

export function redirect(href: string): never {
  throw new Error(`redirect(${href}) is a Next.js server API and is unavailable in Vite.`);
}

export function notFound(): never {
  throw new Error("notFound() is a Next.js server API and is unavailable in Vite.");
}
