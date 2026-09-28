"use client";

import { ExpandableGallery } from "@nebutra/ui/primitives";

const PHOTOS = ["office", "launch", "offsite", "demo-day"].map((seed, i) => ({
  id: seed,
  src: `https://avatar.vercel.sh/${seed}.svg?size=480`,
  alt: `Team ${seed}`,
  rotation: [-6, 4, -2, 7][i] ?? 0,
}));

export function ExpandableGalleryDemo() {
  return (
    <div className="flex w-full justify-center p-10">
      <ExpandableGallery photos={PHOTOS} />
    </div>
  );
}
