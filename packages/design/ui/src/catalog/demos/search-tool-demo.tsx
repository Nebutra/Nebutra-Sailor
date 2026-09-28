"use client";

import { SearchTool } from "@nebutra/ui/primitives";

export function SearchToolDemo() {
  return (
    <div className="w-full max-w-xl p-6">
      <SearchTool
        state="completed"
        query="postgres row level security multi-tenant"
        defaultOpen
        results={[
          { title: "Row Security Policies", source: "postgresql.org", date: "2026-05-11" },
          {
            title: "Multi-tenant data isolation with RLS",
            source: "Engineering notes",
            date: "2026-08-02",
          },
          { title: "Tenant context in connection pools", source: "Team wiki" },
        ]}
      />
    </div>
  );
}
