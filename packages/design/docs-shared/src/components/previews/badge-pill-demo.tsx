"use client";

import { LogoSlackColor } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import Link from "next/link";

export function BadgePillDemo() {
  return (
    <div className="gap-4 flex w-full flex-col items-center justify-center">
      <div className="gap-2 flex flex-initial flex-row items-center justify-center">
        <Badge asChild size="sm" variant="pill">
          <Link href="#badge-pill">Label</Link>
        </Badge>
        <Badge asChild size="md" variant="pill">
          <Link href="#badge-pill">Label</Link>
        </Badge>
        <Badge asChild size="lg" variant="pill">
          <Link href="#badge-pill">Label</Link>
        </Badge>
      </div>
      <div className="gap-2 flex flex-initial flex-row items-center justify-center">
        <Badge asChild icon={<LogoSlackColor />} size="sm" variant="pill">
          <Link href="#badge-pill">Label</Link>
        </Badge>
        <Badge asChild icon={<LogoSlackColor />} size="md" variant="pill">
          <Link href="#badge-pill">Label</Link>
        </Badge>
        <Badge asChild icon={<LogoSlackColor />} size="lg" variant="pill">
          <Link href="#badge-pill">Label</Link>
        </Badge>
      </div>
    </div>
  );
}
