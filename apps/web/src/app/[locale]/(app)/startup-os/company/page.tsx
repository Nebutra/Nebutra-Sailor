"use client";

import { EmptyState } from "@nebutra/ui/layout";
import { Button, Field, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CompanyTower } from "@/components/startup-os/company-tower";
import { ensureTower } from "@/lib/startup-os/company-context/migrate";
import type { CompanyContext, LayerId } from "@/lib/startup-os/company-context/model";

/**
 * The real, living Company Context tower — wired to a real Startup OS project.
 * Reads the project's nine-layer context from the projects API and lets a human
 * edit any seed field inline; the edit PATCHes the context route, which persists
 * the tower so the change flows downstream (generated app, artifacts, prompts,
 * cofounder card). Generate / Upload stay honestly disabled until an AI provider
 * key is configured — they are AI extraction paths, not human edits.
 */

interface ProjectSummary {
  readonly id: string;
  readonly companyContext: CompanyContext;
}

type LoadState = "loading" | "ready" | "empty";

interface EditingField {
  readonly layerId: LayerId;
  readonly fieldKey: string;
}

/** Coerce a stored field value into an editable string draft. */
function valueToDraft(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

/** Parse the draft back into a stored value, by the field kind. */
function draftToValue(draft: string, kind: string): unknown {
  const trimmed = draft.trim();
  if (kind === "line" || kind === "text") return draft;
  if (kind === "list") {
    return trimmed
      .split(/[\n,]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return draft;
  }
}

export default function CompanyContextPage() {
  const pathname = usePathname();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";

  const [state, setState] = useState<LoadState>("loading");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [context, setContext] = useState<CompanyContext | null>(null);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/startup-os/projects", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setState("empty");
          return;
        }
        const data = (await res.json()) as { projects?: ProjectSummary[] };
        const project = data.projects?.[0];
        if (!project?.companyContext) {
          if (!cancelled) setState("empty");
          return;
        }
        if (!cancelled) {
          setProjectId(project.id);
          setContext(ensureTower(project.companyContext, project.id, new Date().toISOString()));
          setState("ready");
        }
      } catch {
        if (!cancelled) setState("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openEditor = useCallback(
    (layerId: LayerId, fieldKey: string) => {
      setError(null);
      setEditing({ layerId, fieldKey });
      setDraft(valueToDraft(context?.layers[layerId]?.values[fieldKey]?.value));
    },
    [context],
  );

  const closeEditor = useCallback(() => {
    setEditing(null);
    setDraft("");
    setError(null);
  }, []);

  const saveField = useCallback(async () => {
    if (editing === null || projectId === null || context === null) return;
    const kind = context.layers[editing.layerId]?.fields[editing.fieldKey]?.kind ?? "text";
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/startup-os/projects/${encodeURIComponent(projectId)}/context`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          layerId: editing.layerId,
          fieldKey: editing.fieldKey,
          value: draftToValue(draft, kind),
        }),
      });
      const body = (await res.json()) as { context?: CompanyContext; error?: string };
      if (!res.ok || !body.context) {
        setError(body.error ?? "Failed to save.");
        return;
      }
      setContext(body.context);
      closeEditor();
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [editing, projectId, context, draft, closeEditor]);

  const generate = useCallback(
    async (layerId: LayerId, fieldKey: string) => {
      if (projectId === null) return;
      setNotice(null);
      try {
        const res = await fetch(
          `/api/startup-os/projects/${encodeURIComponent(projectId)}/context`,
          {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ layerId, fieldKey }),
          },
        );
        const body = (await res.json()) as {
          context?: CompanyContext;
          needsProvider?: boolean;
          error?: string;
        };
        if (body.needsProvider) {
          setNotice("Connect an AI provider key to auto-fill fields.");
          return;
        }
        if (!res.ok || !body.context) {
          setNotice(body.error ?? "Generate failed.");
          return;
        }
        setContext(body.context);
      } catch {
        setNotice("Generate failed.");
      }
    },
    [projectId],
  );

  const editingLabel =
    editing && context
      ? (context.layers[editing.layerId]?.fields[editing.fieldKey]?.label ?? editing.fieldKey)
      : "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {state === "loading" ? (
        <div className="h-96 w-full animate-pulse rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-2" />
      ) : state === "ready" && context ? (
        <>
          {notice ? (
            <div className="mb-3 rounded-[var(--radius-md)] border border-blue-6 bg-blue-2 px-3 py-2 text-xs text-blue-11">
              {notice}
            </div>
          ) : null}
          <CompanyTower context={context} onEditField={openEditor} onGenerateField={generate} />
        </>
      ) : (
        <EmptyState
          title="No company yet"
          description="Compile a company in Startup OS to see and edit its context tower."
          action={
            <Link
              href={`/${locale}/startup-os`}
              className="inline-flex items-center rounded-full bg-neutral-12 px-4 py-2 text-sm font-semibold text-neutral-1 dark:text-neutral-12"
            >
              Open Startup OS
            </Link>
          }
        />
      )}

      {editing ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-6 bg-neutral-1/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neutral-11">
                {editing.layerId} · {editing.fieldKey}
              </span>
              {error ? <span className="text-xs text-red-10">{error}</span> : null}
            </div>
            <Field label={editingLabel} htmlFor="tower-field-edit">
              <Input
                id="tower-field-edit"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={saving}
                autoFocus
              />
            </Field>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeEditor}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => void saveField()}
                disabled={saving}
                className="border-0 text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
