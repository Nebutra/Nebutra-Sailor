"use client";

import { Button } from "@nebutra/ui/primitives";
import { useReducer, useState } from "react";
import { ResumePreview } from "../render/ResumePreview";
import { SectionForm } from "./SectionForm";
import { RESUME_SECTIONS, type SectionDef } from "./sections";
import { type EditorContent, resumeReducer } from "./state";
import { type SaveStatus, useResumeAutosave } from "./useResumeAutosave";

interface ResumeEditorProps {
  initial: EditorContent;
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  dirty: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  invalid: "Some fields need attention",
  error: "Could not save",
};

export function ResumeEditor({ initial }: ResumeEditorProps) {
  const [content, dispatch] = useReducer(resumeReducer, initial);
  const [active, setActive] = useState<SectionDef["id"]>("basic");
  const { status, issues, flush } = useResumeAutosave(content);
  const section = RESUME_SECTIONS.find((s) => s.id === active) ?? RESUME_SECTIONS[0];
  if (!section) return null;

  const sectionHasIssue = (id: string) =>
    issues.some((i) => i.path === id || i.path.startsWith(`${id}.`));
  const sectionHasContent = (id: SectionDef["id"]) => {
    const v = content[id];
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object")
      return Object.values(v).some((x) => x !== undefined && x !== "");
    return false;
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
      <nav
        aria-label="Résumé sections"
        className="border-b border-border p-3 lg:border-b-0 lg:border-r"
      >
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {RESUME_SECTIONS.map((s) => {
            const isActive = s.id === active;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setActive(s.id)}
                  className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-left text-sm ${
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <span>{s.title}</span>
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${
                      sectionHasIssue(s.id)
                        ? "bg-destructive"
                        : sectionHasContent(s.id)
                          ? "bg-primary"
                          : "bg-border"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="p-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{section.title}</h1>
            {section.description && (
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              role="status"
              className={`text-xs ${status === "invalid" || status === "error" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {STATUS_LABEL[status]}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => void flush()}
              disabled={status === "saving"}
            >
              Save now
            </Button>
          </div>
        </header>
        <SectionForm section={section} content={content} issues={issues} dispatch={dispatch} />
      </main>

      <aside
        className="hidden border-l border-border bg-muted/20 p-6 lg:block"
        aria-label="Preview"
      >
        <ResumePreview content={content} />
      </aside>
    </div>
  );
}
