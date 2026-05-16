"use client";

import { Envelope as Mail, MagnifyingGlass as Search } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";

export function InputWithIconDemo() {
  return (
    <div className="flex flex-col gap-4">
      <Input
        aria-label="Search projects"
        type="search"
        prefix={<Search aria-hidden="true" />}
        placeholder="Search projects"
      />
      <Input
        aria-label="Team email"
        prefix={<Mail aria-hidden="true" />}
        type="email"
        placeholder="contact@nebutra.com"
      />
    </div>
  );
}
