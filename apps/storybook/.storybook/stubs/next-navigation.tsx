/**
 * Storybook stub for `next/navigation` (App Router hooks).
 *
 * All hooks return no-op / empty values. Stories that need to assert router
 * interactions should wire their own decorator with controlled state.
 */

type Router = {
  push: (href: string) => Promise<boolean>;
  replace: (href: string) => Promise<boolean>;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
};

const noopRouter: Router = {
  push: async () => true,
  replace: async () => true,
  back: () => {},
  forward: () => {},
  refresh: () => {},
  prefetch: () => {},
};

export function useRouter(): Router {
  return noopRouter;
}

export function usePathname(): string {
  return "/";
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams<
  T extends Record<string, string | string[]> = Record<string, string>,
>(): T {
  return {} as T;
}

export function useSelectedLayoutSegment(): string | null {
  return null;
}

export function useSelectedLayoutSegments(): string[] {
  return [];
}

export function redirect(_url: string): never {
  throw new Error("redirect() called in Storybook stub (next/navigation)");
}

export function permanentRedirect(_url: string): never {
  throw new Error("permanentRedirect() called in Storybook stub (next/navigation)");
}

export function notFound(): never {
  throw new Error("notFound() called in Storybook stub (next/navigation)");
}
