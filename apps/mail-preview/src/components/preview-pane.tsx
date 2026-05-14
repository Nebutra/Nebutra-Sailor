"use client";

import {
  Warning as AlertCircle,
  LoaderCircle as Loader2,
  PaperAirplane as Send,
} from "@nebutra/icons";
import { Input, Textarea } from "@nebutra/ui/primitives";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TemplateMeta } from "@/lib/template-types";

type Tab = "preview" | "plain" | "html" | "props";

interface RenderResult {
  subject: string;
  html: string;
  plainText: string;
}

interface PreviewPaneProps {
  template: TemplateMeta;
}

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "preview", label: "Preview" },
  { id: "plain", label: "Plain Text" },
  { id: "html", label: "HTML Source" },
  { id: "props", label: "Props" },
];

export function PreviewPane({ template }: PreviewPaneProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const [propsText, setPropsText] = useState<string>(() =>
    JSON.stringify(template.defaultProps, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [rendered, setRendered] = useState<RenderResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Reset editor when the user picks a different template.
  useEffect(() => {
    setPropsText(JSON.stringify(template.defaultProps, null, 2));
    setParseError(null);
    setRenderError(null);
    setRendered(null);
    setTab("preview");
  }, [template.defaultProps]);

  // Debounced re-render whenever the props JSON changes.
  useEffect(() => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(propsText) as Record<string, unknown>;
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON");
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(() => {
      setIsRendering(true);
      void fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: template.id, props: parsed }),
        signal: controller.signal,
      })
        .then(async (res) => {
          const data = (await res.json()) as Partial<RenderResult> & { error?: string };
          if (!res.ok || typeof data.html !== "string" || typeof data.subject !== "string") {
            setRenderError(data.error ?? `Render failed (HTTP ${res.status})`);
            setRendered(null);
            return;
          }
          setRenderError(null);
          setRendered({
            subject: data.subject,
            html: data.html,
            plainText: data.plainText ?? "",
          });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setRenderError(error instanceof Error ? error.message : "Network error");
        })
        .finally(() => setIsRendering(false));
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [propsText, template.id]);

  return (
    <section className="flex h-full flex-1 flex-col bg-[var(--neutral-1)]">
      <Header template={template} subject={rendered?.subject ?? "—"} isRendering={isRendering} />

      <Tabs current={tab} onChange={setTab} />

      <div className="flex-1 overflow-hidden">
        {renderError && tab !== "props" ? <ErrorBanner message={renderError} /> : null}

        {tab === "preview" && <IframePreview html={rendered?.html ?? ""} />}
        {tab === "plain" && <PlainTextView text={rendered?.plainText ?? ""} />}
        {tab === "html" && <HtmlSourceView html={rendered?.html ?? ""} />}
        {tab === "props" && (
          <PropsEditor
            value={propsText}
            onChange={setPropsText}
            parseError={parseError}
            template={template}
          />
        )}
      </div>
    </section>
  );
}

function Header({
  template,
  subject,
  isRendering,
}: {
  template: TemplateMeta;
  subject: string;
  isRendering: boolean;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-[var(--neutral-6)] px-6 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--neutral-12)]">{template.label}</h2>
        <p className="mt-0.5 truncate text-xs text-[var(--neutral-10)]">{template.description}</p>
        <p className="mt-2 text-sm text-[var(--neutral-11)]">
          <span className="text-[var(--neutral-10)]">Subject: </span>
          <span className="font-medium text-[var(--neutral-12)]">{subject}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isRendering ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--neutral-10)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Rendering…
          </span>
        ) : null}
      </div>
    </header>
  );
}

function Tabs({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div
      className="flex gap-1 border-b border-[var(--neutral-6)] px-4 pt-2"
      role="tablist"
      aria-label="Preview view"
    >
      {TABS.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={[
              "rounded-t-md px-3 py-2 text-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-1",
              active
                ? "border-b-2 border-[var(--blue-9)] font-medium text-[var(--neutral-12)]"
                : "border-b-2 border-transparent text-[var(--neutral-11)] hover:text-[var(--neutral-12)]",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border-b border-[var(--neutral-6)] bg-[color:var(--status-danger)]/10 px-6 py-2 text-sm text-[color:var(--status-danger)]">
      <span className="inline-flex items-center gap-2">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        {message}
      </span>
    </div>
  );
}

function IframePreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Use srcDoc to fully isolate template styles from the host document.
  return (
    <div className="h-full overflow-auto bg-[var(--neutral-3)] p-6">
      <iframe
        ref={iframeRef}
        title="Email preview"
        sandbox="allow-same-origin"
        srcDoc={html}
        className="mx-auto block h-[80vh] w-full max-w-3xl rounded-lg border border-[var(--neutral-6)] bg-white shadow-sm"
      />
    </div>
  );
}

function PlainTextView({ text }: { text: string }) {
  return (
    <pre className="h-full overflow-auto whitespace-pre-wrap break-words bg-[var(--neutral-2)] p-6 text-sm leading-relaxed text-[var(--neutral-12)]">
      {text || "(empty)"}
    </pre>
  );
}

function HtmlSourceView({ html }: { html: string }) {
  return (
    <pre className="h-full overflow-auto bg-[var(--neutral-12)] p-6 text-xs leading-relaxed text-[var(--neutral-2)]">
      <code>{html || "(no html yet)"}</code>
    </pre>
  );
}

function PropsEditor({
  value,
  onChange,
  parseError,
  template,
}: {
  value: string;
  onChange: (next: string) => void;
  parseError: string | null;
  template: TemplateMeta;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-6">
        <label
          htmlFor="props-editor"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--neutral-10)]"
        >
          Props (JSON)
        </label>
        <Textarea
          id="props-editor"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
        {parseError ? (
          <p className="mt-2 text-xs text-[color:var(--status-danger)]">
            JSON parse error: {parseError}
          </p>
        ) : (
          <p className="mt-2 text-xs text-[var(--neutral-10)]">
            Edits apply automatically (debounced 250ms).
          </p>
        )}
      </div>
      <SendTestPanel templateId={template.id} propsText={value} disabled={Boolean(parseError)} />
    </div>
  );
}

function SendTestPanel({
  templateId,
  propsText,
  disabled,
}: {
  templateId: string;
  propsText: string;
  disabled: boolean;
}) {
  const isProd = useMemo(
    () => typeof process !== "undefined" && process.env.NODE_ENV === "production",
    [],
  );
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  if (isProd) return null;

  async function send() {
    setStatus(null);
    setPending(true);
    try {
      const props = JSON.parse(propsText) as Record<string, unknown>;
      const res = await fetch("/api/send-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId, props, to }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus({ tone: "ok", message: `Sent to ${to}` });
      } else {
        setStatus({ tone: "err", message: data.error ?? `HTTP ${res.status}` });
      }
    } catch (error) {
      setStatus({
        tone: "err",
        message: error instanceof Error ? error.message : "Send failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-t border-[var(--neutral-6)] bg-[var(--neutral-2)] px-6 py-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--neutral-10)]">
        Send test email (dev only)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="email"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="you@example.com"
          aria-label="Recipient email address"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={disabled || pending || !to}
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          Send test
        </button>
      </div>
      {status ? (
        <p
          className={`mt-2 text-xs ${
            status.tone === "ok"
              ? "text-[color:var(--status-success)]"
              : "text-[color:var(--status-danger)]"
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
