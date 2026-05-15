"use client";

import { ArrowRight } from "@nebutra/icons";
import { Button, ExpandableGallery, type GalleryPhoto } from "@nebutra/ui/primitives";

const PHOTOS: GalleryPhoto[] = [
  {
    id: "p1",
    src: "https://images.unsplash.com/photo-1755398104393-746e52af4a9f?w=900&auto=format&fit=crop&q=60",
    alt: "Technology setup",
    rotation: -15,
    x: -90,
    y: 10,
    zIndex: 10,
  },
  {
    id: "p2",
    src: "https://images.unsplash.com/photo-1756764099214-b09a5666914b?w=900&auto=format&fit=crop&q=60",
    alt: "Design research",
    rotation: -3,
    x: -10,
    y: -15,
    zIndex: 20,
  },
  {
    id: "p3",
    src: "https://images.unsplash.com/photo-1757372429884-92e02350c5d9?w=900&auto=format&fit=crop&q=60",
    alt: "Code and development",
    rotation: 12,
    x: 75,
    y: 5,
    zIndex: 30,
  },
  {
    id: "p4",
    src: "https://images.unsplash.com/photo-1756993399574-2fa126269ce7?w=900&auto=format&fit=crop&q=60",
    alt: "Dashboard interface",
  },
  {
    id: "p5",
    src: "https://images.unsplash.com/photo-1756990637536-714b76296a30?w=900&auto=format&fit=crop&q=60",
    alt: "Product design",
  },
  {
    id: "p6",
    src: "https://images.unsplash.com/photo-1756838197413-07f174def66c?w=900&auto=format&fit=crop&q=60",
    alt: "Laptop on desk",
  },
  {
    id: "p7",
    src: "https://images.unsplash.com/photo-1756310406492-3ce3bef447aa?w=900&auto=format&fit=crop&q=60",
    alt: "Team collaboration",
  },
  {
    id: "p8",
    src: "https://images.unsplash.com/photo-1755311905796-d539c7d24acd?w=900&auto=format&fit=crop&q=60",
    alt: "UX wireframes",
  },
  {
    id: "p9",
    src: "https://images.unsplash.com/photo-1755542366797-b3f036b11310?w=900&auto=format&fit=crop&q=60",
    alt: "Developer workspace",
  },
];

export function ExpandableGalleryDemo() {
  return (
    <div className="flex min-h-[820px] w-full items-start justify-center bg-background px-4 py-8 md:px-8">
      <ExpandableGallery photos={PHOTOS}>
        <h2 className="text-2xl font-normal leading-tight tracking-tight text-foreground/90 md:text-4xl">
          People don&rsquo;t fall in love with components.
          <br className="hidden md:block" /> They fall in love with how something feels.
        </h2>
        <div className="flex justify-center">
          <Button variant="default" className="group rounded-full px-8 py-6 font-normal">
            Explore more components
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </ExpandableGallery>
    </div>
  );
}
