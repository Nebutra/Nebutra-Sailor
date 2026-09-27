"use client";

import { MacbookPro } from "@nebutra/ui/primitives";

export function MacbookProDemo() {
  return (
    <div className="max-w-4xl p-8 relative mx-auto flex w-full items-center justify-center">
      <MacbookPro
        src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop"
        className="h-auto w-full"
      />
    </div>
  );
}
