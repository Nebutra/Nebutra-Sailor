"use client";

/**
 * Atelier canvas surface (demo).
 *
 * The browser is intentionally a thin renderer: it draws elements at the
 * coordinates the SERVER chose (`@nebutra/atelier-canvas` placement). This is
 * the absorbed product's core property — server-authoritative placement — and
 * a deliberately minimal stand-in for a full editor (production swaps in
 * Excalidraw without changing the server contract; see REPLICATION_GUIDE).
 */

import type { CanvasElement, CanvasFile, ScenePatch } from "@nebutra/atelier-canvas";
import { Sparkles } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { Button, Textarea, toast } from "@nebutra/ui/primitives";
import { useCallback, useMemo, useState } from "react";

/** Scene coords can run large; scale them into a fixed viewport. */
const SCALE = 0.28;

interface AtelierCanvasProps {
  readonly canvasId: string;
}

export function AtelierCanvas({ canvasId }: AtelierCanvasProps) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [files, setFiles] = useState<CanvasFile[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const fileById = useMemo(() => {
    const m = new Map<string, CanvasFile>();
    for (const f of files) m.set(f.id, f);
    return m;
  }, [files]);

  const submit = useCallback(async () => {
    const value = prompt.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/atelier/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId, prompt: value }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: { patch?: ScenePatch };
      };
      if (!res.ok || !json.success || !json.data?.patch) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      const { element, file } = json.data.patch;
      setElements((prev) => [...prev, element]);
      if (file) setFiles((prev) => [...prev, file]);
      setPrompt("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }, [prompt, busy, canvasId]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
      {/* Canvas viewport */}
      <div className="relative h-[560px] overflow-auto rounded-lg border border-neutral-7 bg-neutral-2">
        {elements.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-11">
            <p className="text-sm">Generated assets land here, placed by the server.</p>
          </div>
        ) : (
          elements.map((el) => {
            const style = {
              left: el.x * SCALE,
              top: el.y * SCALE,
              width: el.width * SCALE,
              height: el.height * SCALE,
            } as const;
            if (el.type === "embeddable") {
              return (
                <video
                  key={el.id}
                  src={el.ref}
                  controls
                  aria-label={String(el.meta?.prompt ?? "generated video")}
                  className="absolute rounded-md border border-neutral-7 shadow-sm"
                  style={style}
                >
                  <track kind="captions" />
                </video>
              );
            }
            const src = fileById.get(el.ref)?.dataURL;
            return (
              <img
                key={el.id}
                src={src}
                alt={String(el.meta?.prompt ?? "generated asset")}
                className="absolute rounded-md border border-neutral-7 shadow-sm"
                style={style}
              />
            );
          })
        )}
      </div>

      {/* Prompt panel */}
      <AnimateIn preset="fade">
        <div className="flex h-full flex-col gap-3 rounded-lg border border-neutral-7 bg-neutral-1 p-4">
          <h2 className="font-semibold text-neutral-12 text-sm">Brief</h2>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A serene alpine lake at dawn, editorial photography…"
            rows={5}
            disabled={busy}
          />
          <Button type="button" onClick={submit} disabled={busy || !prompt.trim()}>
            <Sparkles className="mr-2 h-4 w-4" />
            {busy ? "Generating…" : "Generate"}
          </Button>
          <p className="mt-auto text-neutral-11 text-xs">
            Mock provider — no AI key needed. The server picks a non-overlapping position and
            persists before this panel is told.
          </p>
        </div>
      </AnimateIn>
    </div>
  );
}
