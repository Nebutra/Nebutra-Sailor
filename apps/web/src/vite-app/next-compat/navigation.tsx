import { useLocation, useNavigate } from "@tanstack/react-router";

export function usePathname() {
  return useLocation({ select: (location) => location.pathname });
}

export function useSearchParams() {
  useLocation({ select: (location) => location.href });
  return new URLSearchParams(globalThis.location?.search ?? "");
}

export function useRouter() {
  const navigate = useNavigate();

  return {
    push: (href: string) => void navigate({ to: href }),
    replace: (href: string) => void navigate({ to: href, replace: true }),
    refresh: () => globalThis.location.reload(),
    back: () => globalThis.history.back(),
    forward: () => globalThis.history.forward(),
    prefetch: async () => undefined,
  };
}

export function redirect(href: string): never {
  throw new Error(`redirect(${href}) is a Next.js server API and is unavailable in Vite.`);
}

export function notFound(): never {
  throw new Error("notFound() is a Next.js server API and is unavailable in Vite.");
}
