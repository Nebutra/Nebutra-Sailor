"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DESKTOP_DEMO_QUERY = "(min-width: 1024px)";

function DesktopDemoSkeleton() {
  return <section aria-hidden className="hidden min-h-[48rem] w-full lg:block" />;
}

const ProductDemoSection = dynamic(
  () => import("./ProductDemoSection").then((module) => module.ProductDemoSection),
  {
    loading: () => <DesktopDemoSkeleton />,
    ssr: false,
  },
);

export function DesktopProductDemoSection() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_DEMO_QUERY);
    const sync = () => setIsDesktop(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (isDesktop === null) return <DesktopDemoSkeleton />;
  if (!isDesktop) return null;

  return <ProductDemoSection />;
}
