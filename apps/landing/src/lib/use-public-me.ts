"use client";

import { useEffect, useState } from "react";
import { loadPublicMe, type PublicMe } from "@/lib/public-me";

export function usePublicMe(): PublicMe | null {
  const [me, setMe] = useState<PublicMe | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadPublicMe().then((data) => {
      if (!cancelled) setMe(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return me;
}
