"use client";

import { ResumeContentV1Schema } from "@nebutra/contracts/sleptons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useReducer, useState } from "react";
import { downloadJson, downloadMarkdown } from "../export/download";
import { type DocumentMode, ResumeDocument } from "../render/ResumeDocument";
import { ResumePreview } from "../render/ResumePreview";
import { PreferencesForm } from "./PreferencesForm";
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

type NavId = SectionDef["id"] | "preferences";
type PreviewMode = "card" | DocumentMode;

const PREVIEW_MODES: { id: PreviewMode; label: string }[] = [
  { id: "card", label: "Card" },
  { id: "design", label: "Document" },
  { id: "ats", label: "ATS" },
];

export function ResumeEditor({ initial }: ResumeEditorProps) {
  const [content, dispatch] = useReducer(resumeReducer, initial);
  const [active, setActive] = useState<NavId>("basic");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("card");
  const { status, issues, flush } = useResumeAutosave(content);

  const section = RESUME_SECTIONS.find((s) => s.id === active);
  const parsed = ResumeContentV1Schema.safeParse(content);
  const valid = parsed.success ? parsed.data : null;

  const sectionHasIssue = (id: string) =>
    issues.some((i) => i.path === id || i.path.startsWith(`${id}.`));
  const sectionHasContent = (id: SectionDef["id"]) => {
    const v = content[id];
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object")
      return Object.values(v).some((x) => x !== undefined && x !== "");
    return false;
  };

  const navItem = (id: NavId, title: string, dot?: "issue" | "filled" | "empty") => {
    const isActive = id === active;
    return (
      <li key={id}>
        <button
          type="button"
          aria-current={isActive ? "page" : undefined}
          onClick={() => setActive(id)}
          className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-left text-sm ${
            isActive
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <span>{title}</span>
          {dot && (
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                dot === "issue" ? "bg-destructive" : dot === "filled" ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_420px]">
      <nav
        aria-label="Résumé sections"
        className="border-b border-border p-3 lg:border-b-0 lg:border-r"
      >
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {RESUME_SECTIONS.map((s) =>
            navItem(
              s.id,
              s.title,
              sectionHasIssue(s.id) ? "issue" : sectionHasContent(s.id) ? "filled" : "empty",
            ),
          )}
          <li aria-hidden className="my-2 hidden border-t border-border lg:block" />
          {navItem("preferences", "Preferences")}
        </ul>
      </nav>

      <main className="p-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {section ? section.title : "Preferences"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {section ? section.description : "Paper, length and what the public page shows."}
            </p>
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
        {section ? (
          <SectionForm section={section} content={content} issues={issues} dispatch={dispatch} />
        ) : (
          <PreferencesForm content={content} dispatch={dispatch} />
        )}
      </main>

      <aside className="hidden border-l border-border bg-muted/20 lg:block" aria-label="Preview">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <div role="tablist" aria-label="Preview mode" className="flex gap-1">
            {PREVIEW_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={previewMode === m.id}
                onClick={() => setPreviewMode(m.id)}
                className={`rounded-md px-2 py-1 text-xs ${
                  previewMode === m.id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              disabled={!valid}
              onClick={() => valid && downloadMarkdown(valid)}
            >
              .md
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!valid}
              onClick={() => valid && downloadJson(valid)}
            >
              .json
            </Button>
            <Button asChild variant="ghost">
              <Link href="/resume/print" target="_blank" rel="noopener">
                Print
              </Link>
            </Button>
          </div>
        </div>
        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-6">
          {previewMode === "card" ? (
            <ResumePreview content={content} />
          ) : valid ? (
            <ResumeDocument content={valid} mode={previewMode} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Preview updates once the required fields are valid.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
