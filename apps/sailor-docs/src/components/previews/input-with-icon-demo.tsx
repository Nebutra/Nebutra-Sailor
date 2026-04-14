"use client";

import { Input } from "@nebutra/ui/primitives";
import { Mail, Search } from "lucide-react";

export function InputWithIconDemo() {
  return (
    <div className="gap-4 flex flex-col">
      {/* Search icon */}
      <Input prefix={<Search className="w-4 h-4 text-muted-foreground" />} placeholder="Search…" />

      {/* Mail icon */}
      <Input
        prefix={<Mail className="w-4 h-4 text-muted-foreground" />}
        type="email"
        placeholder="contact@nebutra.com"
      />
    </div>
  );
}
