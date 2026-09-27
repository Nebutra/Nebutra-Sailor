"use client";

import { Button } from "@nebutra/ui/primitives";

export function ButtonWithIconDemo() {
  return (
    <div className="gap-4 flex flex-wrap items-center">
      <Button>
        <span className="mr-2">✉️</span> Login with Email
      </Button>
      <Button>
        Continue <span className="ml-2">➔</span>
      </Button>
    </div>
  );
}
