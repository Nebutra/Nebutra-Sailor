"use client";

import { PageHeader } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";

export function PageHeaderDemo() {
  return (
    <div className="w-full p-6">
      <PageHeader
        title="Projects"
        description="Everything your team deploys, newest first."
        actions={<Button>New project</Button>}
      />
    </div>
  );
}
