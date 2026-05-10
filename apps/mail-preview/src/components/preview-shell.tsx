"use client";

import { useState } from "react";
import type { TemplateMeta } from "@/lib/template-types";
import { PreviewPane } from "./preview-pane";
import { Sidebar } from "./sidebar";

interface PreviewShellProps {
  templates: readonly TemplateMeta[];
}

export function PreviewShell({ templates }: PreviewShellProps) {
  const initialId = templates[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId);
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

  if (!selected) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--neutral-10)]">
        No templates registered in @nebutra/email.
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar templates={templates} selectedId={selected.id} onSelect={setSelectedId} />
      <PreviewPane template={selected} />
    </div>
  );
}
