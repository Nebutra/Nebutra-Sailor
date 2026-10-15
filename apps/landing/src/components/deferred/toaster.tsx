"use client";

/**
 * A module of its own so `next/dynamic` can load the toast outlet (sonner) as a
 * separate chunk while the static import keeps the @nebutra/ui barrel
 * optimisation. See components/deferred-chrome.tsx.
 */
export { Toaster } from "@nebutra/ui/primitives";
