"use client";

import { AvatarGroup } from "@nebutra/ui/primitives";

export function AvatarGroupSimpleDemo() {
  return (
    <AvatarGroup
      members={[
        { username: "leerob" },
        { username: "rauchg" },
        { username: "shuding" },
        { username: "rauno" },
        { username: "sambecker" },
      ]}
      limit={4}
      size={32}
    />
  );
}
