"use client";

import { useTheme } from "@nebutra/tokens";
import { parsePreset } from "@nebutra/tokens/preset";
import { Button } from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";
import { PRESET_COOKIE, readPresetCookie, writePresetCookie } from "@/lib/preset-cookie";

/**
 * The preview site follows Sailor Studio.
 *
 * On a build with NEXT_PUBLIC_PRESET_PREVIEW=1 (the demonstration site Studio
 * links to — ADR 2026-09-27 Sailor Studio, "Studio previews the site you get")
 * the page wears the look the visitor last chose in Studio: Studio writes it to
 * a cookie on the shared domain, /preset-preview.css paints it on the server,
 * so the first frame is already theirs. `?preset=<code>` sets it too, for a
 * link opened in another browser. A project's own site never sets the flag:
 * its look is built into project.css by `nebutra apply --preset`.
 */

/** Re-request the server-painted stylesheet after the cookie changes. */
function refreshStylesheet() {
  const link = document.querySelector<HTMLLinkElement>('link[href^="/preset-preview.css"]');
  if (link) link.href = `/preset-preview.css?v=${Date.now()}`;
}

export function PresetPreview() {
  const { setTheme } = useTheme();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("preset");
    if (fromUrl) {
      try {
        const preset = parsePreset(fromUrl);
        writePresetCookie(fromUrl);
        refreshStylesheet();
        if (preset.mode === "light" || preset.mode === "dark") setTheme(preset.mode);
      } catch {
        // Not a preset: leave the site as it is.
      }
    }
    setCode(readPresetCookie(document.cookie));
  }, [setTheme]);

  if (!code) return null;

  const exit = () => {
    writePresetCookie(null);
    refreshStylesheet();
    const url = new URL(window.location.href);
    url.searchParams.delete("preset");
    window.history.replaceState(null, "", url);
    setCode(null);
  };

  return (
    <div
      role="status"
      data-cookie={PRESET_COOKIE}
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background/90 py-1.5 pr-1.5 pl-4 text-sm shadow-ambient-md backdrop-blur-xl"
    >
      <span className="text-muted-foreground">
        Your Sailor Studio look <code className="font-mono text-foreground">{code}</code>
      </span>
      <Button type="button" variant="secondary" size="sm" onClick={exit}>
        Show the default
      </Button>
    </div>
  );
}
