/**
 * Storybook stub for `next/dynamic`.
 *
 * Maps Next.js's dynamic() to React's lazy() + Suspense — preserves the
 * lazy-loading semantics without Next's hydration / SSR codepaths.
 */

import { type ComponentType, lazy, type ReactElement, Suspense } from "react";

type DynamicOptions = {
  loading?: () => ReactElement | null;
  ssr?: boolean;
  suspense?: boolean;
};

type ImporterResult<P> = { default: ComponentType<P> } | ComponentType<P>;

export default function dynamic<P extends object = Record<string, unknown>>(
  importer: () => Promise<ImporterResult<P>>,
  options?: DynamicOptions,
): ComponentType<P> {
  const LazyComponent = lazy(async () => {
    const mod = await importer();
    if (typeof mod === "function") return { default: mod };
    return mod;
  });
  const Loading = options?.loading;
  return function DynamicStub(props: P) {
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
