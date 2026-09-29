"use client";

import { type Preset, parsePreset } from "@nebutra/tokens/preset";
import { Button } from "@nebutra/ui/primitives";
import { useCallback, useEffect, useState } from "react";
import { presetArgument } from "./studio-output";

/**
 * Presets saved to the person's account (gateway /api/v1/studio/presets): what
 * their agent proposed with `nebutra studio preview` while logged in, and what
 * they saved here. The sync half of the agent loop — no link to copy either way.
 * Signed out, it says how to turn sync on and nothing else.
 */

interface SavedPreset {
  id: string;
  name: string;
  code: string;
  source: string;
  updatedAt: string;
}

type State =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "error" }
  | { kind: "ready"; presets: SavedPreset[] };

const API = () => (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const ENDPOINT = () => `${API()}/api/v1/studio/presets`;

function ago(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function YourPresets({
  preset,
  onOpen,
}: {
  preset: Preset;
  onOpen: (preset: Preset) => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINT(), { credentials: "include" });
      if (res.status === 401) return setState({ kind: "signed-out" });
      if (!res.ok) return setState({ kind: "error" });
      const body = (await res.json()) as { presets: SavedPreset[] };
      setState({ kind: "ready", presets: body.presets });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    // An agent may save while the page is open: look again when it regains focus.
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(ENDPOINT(), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: presetArgument(preset), source: "web" }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (state.kind === "loading" || state.kind === "error") return null;

  if (state.kind === "signed-out") {
    return (
      <p className="rounded-[var(--radius-md)] border border-border border-dashed px-3 py-2.5 text-2xs text-muted-foreground leading-relaxed">
        Sign in, and <span className="font-mono text-foreground">nebutra login</span> in your
        terminal, to see what your agent proposes here without copying links.
      </p>
    );
  }

  const current = presetArgument(preset);
  return (
    <section className="grid gap-2" aria-label="Your presets">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-foreground text-xs">Your presets</h3>
        <Button type="button" variant="ghost" size="tiny" onClick={save} disabled={saving}>
          {saving ? "Saving" : "Save this look"}
        </Button>
      </div>
      {state.presets.length === 0 ? (
        <p className="text-2xs text-muted-foreground">
          Nothing saved yet. Your agent's proposals land here too.
        </p>
      ) : (
        <ul className="grid gap-1">
          {state.presets.slice(0, 6).map((p) => (
            <li key={p.id}>
              <Button
                type="button"
                variant="ghost"
                size="tiny"
                aria-current={p.code === current ? "true" : undefined}
                className="h-auto w-full justify-between gap-3 px-2 py-1.5 text-left font-normal"
                onClick={() => {
                  try {
                    onOpen(parsePreset(p.code));
                  } catch {
                    // A code from a newer Studio than this page: leave the look as it is.
                  }
                }}
              >
                <span className="min-w-0 truncate text-foreground text-xs">{p.name}</span>
                <span className="shrink-0 text-2xs text-muted-foreground">
                  {p.source === "web" ? "" : `${p.source} · `}
                  {ago(p.updatedAt)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
