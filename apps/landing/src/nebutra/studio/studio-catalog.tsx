"use client";

import { ArrowLeft, MagnifyingGlass as Search } from "@nebutra/icons";
import { CATALOG, CATALOG_CATEGORIES } from "@nebutra/ui/catalog";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { type CatalogFilter, type FrameState, isFromFrame, type ToFrame } from "./frame-protocol";

/**
 * Studio's Components view: the whole @nebutra/ui catalog under the chosen
 * look (ADR 2026-09-27 UI catalog). The catalog renders in a same-origin frame
 * (frame-protocol.ts); this side owns the filter and forwards the look.
 */

const count = (filter: CatalogFilter) =>
  filter === "all" ? CATALOG.length : CATALOG.filter((e) => e.category === filter).length;

const filterLabel = (filter: CatalogFilter) =>
  filter === "all"
    ? "All components"
    : (CATALOG_CATEGORIES.find((c) => c.id === filter)?.title ?? filter);

export function CatalogControls({
  category,
  onCategoryChange,
  query,
  onQueryChange,
  entry,
  onBack,
}: {
  category: CatalogFilter;
  onCategoryChange: (category: CatalogFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  entry: string | null;
  onBack: () => void;
}) {
  if (entry) {
    const title = CATALOG.find((e) => e.id === entry)?.title ?? entry;
    return (
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5 px-2">
          <ArrowLeft className="size-4" />
          Components
        </Button>
        <span className="truncate font-medium text-foreground text-sm">{title}</span>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Select value={category} onValueChange={(v) => onCategoryChange(v as CatalogFilter)}>
        <SelectTrigger size="small" className="h-8 w-48" aria-label="Category">
          <SelectValue>
            {filterLabel(category)} · {count(category)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(["all", ...CATALOG_CATEGORIES.map((c) => c.id)] as CatalogFilter[]).map((id) => (
            <SelectItem key={id} value={id}>
              {filterLabel(id)} · {count(id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        aria-label="Search components"
        placeholder="Search components..."
        size="sm"
        value={query}
        onValueChange={onQueryChange}
        prefix={<Search className="size-4" />}
        className="w-56"
      />
    </div>
  );
}

export function CatalogFrame({
  state,
  width,
  minHeight,
  onOpen,
}: {
  state: FrameState;
  width: number;
  minHeight: number;
  onOpen: (entry: string | null) => void;
}) {
  // The frame lives under the Studio page, in whatever locale it was opened.
  const frameSrc = `${usePathname().replace(/\/$/, "")}/frame`;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const latest = useRef(state);
  latest.current = state;

  const send = useCallback((next: FrameState) => {
    const target = frameRef.current?.contentWindow;
    if (!target) return;
    const message: ToFrame = { type: "studio:state", state: next };
    target.postMessage(message, window.location.origin);
  }, []);

  // The frame announces itself once it can listen; answer with the current state.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow || !isFromFrame(event.data)) return;
      if (event.data.type === "studio:ready") send(latest.current);
      else onOpen(event.data.entry);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onOpen, send]);

  useEffect(() => {
    send(state);
  }, [send, state]);

  return (
    <iframe
      ref={frameRef}
      title="Component catalog"
      src={frameSrc}
      className="mx-auto block w-full rounded-[var(--radius-lg)] border border-border bg-background"
      style={{ maxWidth: `${width}px`, height: "100%", minHeight: `${minHeight}px` }}
    />
  );
}
