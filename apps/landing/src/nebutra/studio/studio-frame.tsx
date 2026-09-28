"use client";

import { CATALOG, CATALOG_CATEGORIES, type CatalogEntry } from "@nebutra/ui/catalog";
import { loadDemo } from "@nebutra/ui/catalog/loaders";
import { Badge, Button, CodeBlock, CopyButton } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import {
  Component,
  type ComponentType,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { carrierForPreset } from "@/lib/preset-carrier";
import { type FrameState, type FromFrame, isToFrame } from "./frame-protocol";

/**
 * The catalog frame — Studio's Components view, rendered in its own document
 * (see frame-protocol.ts). The parent sends the look and the filter; the frame
 * paints the look onto <html>, lays out the catalog and reports which entry is
 * open. Every demo is a real @nebutra/ui demo from the catalog, loaded as its
 * own chunk when it is about to be seen.
 */

const INITIAL: FrameState = {
  preset: { base: "factory" },
  dark: false,
  category: "all",
  query: "",
  entry: null,
};

const CARRIER_STYLE_ID = "studio-carrier";
const categoryTitle = new Map<string, string>(CATALOG_CATEGORIES.map((c) => [c.id, c.title]));

function post(message: FromFrame) {
  window.parent.postMessage(message, window.location.origin);
}

/** Paint the look onto the whole document, so portals wear it too. */
function usePaintedLook(state: FrameState) {
  useEffect(() => {
    const html = document.documentElement;
    const carrier = carrierForPreset(state.preset, "html");
    let style = document.getElementById(CARRIER_STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = CARRIER_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = carrier.css;
    if (carrier.brandId) html.dataset.brand = carrier.brandId;
    else delete html.dataset.brand;
    html.classList.toggle("dark", state.dark);
    html.classList.toggle("light", !state.dark);
    html.style.colorScheme = state.dark ? "dark" : "light";
  }, [state.preset, state.dark]);
}

function matches(entry: CatalogEntry, state: FrameState): boolean {
  if (state.category !== "all" && entry.category !== state.category) return false;
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  return `${entry.title} ${entry.id} ${categoryTitle.get(entry.category)}`
    .toLowerCase()
    .includes(q);
}

class DemoBoundary extends Component<{ id: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <p className="font-mono text-2xs text-muted-foreground">{this.props.id} failed to render</p>
      );
    }
    return this.props.children;
  }
}

/** Mount a demo when it comes near the viewport, never before. */
function LazyDemo({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [Demo, setDemo] = useState<ComponentType | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let cancelled = false;
    const load = () => {
      loadDemo(id).then(
        (component) => {
          if (!cancelled) setDemo(() => component);
        },
        () => {
          if (!cancelled) setDemo(() => () => <span className="text-2xs">{id} is missing</span>);
        },
      );
    };
    if (typeof IntersectionObserver === "undefined") {
      load();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [id]);

  return (
    <div ref={ref} className="flex w-full items-center justify-center">
      {Demo ? (
        <DemoBoundary id={id}>
          {/* A column, so a demo that returns several siblings stacks them. Full
              width, so a demo that fills its container (w-full, aspect boxes,
              canvases) has something to fill instead of measuring zero. */}
          <div className="flex w-full min-w-0 max-w-full flex-col items-center">
            <Demo />
          </div>
        </DemoBoundary>
      ) : (
        <div className="h-24 w-full animate-pulse rounded-[var(--radius-md)] bg-muted/60" />
      )}
    </div>
  );
}

/** Widest a thumbnail lays its demo out before scaling it down. */
const THUMB_LAYOUT_WIDTH = 560;
const THUMB_MIN_WIDTH = 360;
const THUMB_PADDING = 16;

/**
 * A demo is laid out at a real width, measured, then scaled down to fit the
 * card whole — never cropped. The transform also makes this box the
 * containing block for `position: fixed`, so a demo's toast, island or
 * overlay stays inside its own card instead of floating over the grid.
 */
function FitThumb({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const fit = () => {
      const availW = box.clientWidth - THUMB_PADDING * 2;
      const availH = box.clientHeight - THUMB_PADDING * 2;
      const w = content.scrollWidth || THUMB_LAYOUT_WIDTH;
      const h = content.scrollHeight || 1;
      // Never enlarge past the demo's own size; shrink only what does not fit.
      setScale(Math.min(1, availW / w, availH / h));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className="absolute inset-0 [transform:translateZ(0)]">
      <div
        ref={inner}
        className="absolute top-1/2 left-1/2 flex flex-col items-center"
        style={{
          // Natural width up to the layout width: a small control keeps its
          // real size, a wide table is laid out wide and scaled to fit.
          width: "max-content",
          // A floor for demos that fill their container (w-full, aspect
          // boxes, canvases): with nothing to fill they would measure zero.
          minWidth: THUMB_MIN_WIDTH,
          maxWidth: THUMB_LAYOUT_WIDTH,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EntryCard({ entry, onOpen }: { entry: CatalogEntry; onOpen: () => void }) {
  const demo = entry.demos[0];
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <div
        className="studio-frame-thumb pointer-events-none relative h-56 overflow-hidden bg-background"
        aria-hidden="true"
      >
        {demo ? (
          <FitThumb>
            <LazyDemo id={demo} />
          </FitThumb>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            No demo yet
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={onOpen}
        className="h-auto justify-between gap-2 rounded-none border-border border-t px-3 py-2.5 text-left font-normal"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground text-sm">{entry.title}</span>
          <span className="block truncate text-muted-foreground text-xs">
            {categoryTitle.get(entry.category)} · {entry.demos.length}{" "}
            {entry.demos.length === 1 ? "demo" : "demos"}
          </span>
        </span>
        {entry.status === "experimental" ? (
          <Badge variant="gray-subtle" size="sm">
            Experimental
          </Badge>
        ) : null}
      </Button>
    </li>
  );
}

interface RegistryItem {
  files: { content: string }[];
}

function DemoCode({ id }: { id: string }) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/r/${id}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<RegistryItem>) : null))
      .then((item) => {
        if (!cancelled) setSource(item?.files[0]?.content ?? "");
      })
      .catch(() => {
        if (!cancelled) setSource("");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (source === null) return <div className="h-32 animate-pulse bg-muted/60" />;
  if (!source) return <p className="p-4 text-muted-foreground text-xs">Source unavailable.</p>;
  return (
    <CodeBlock language="tsx" filename={`${id}.tsx`} maxHeight={420}>
      {source}
    </CodeBlock>
  );
}

function DemoPanel({ id }: { id: string }) {
  const [showCode, setShowCode] = useState(false);
  const install = `npx shadcn@latest add ${window.location.origin}/r/${id}.json`;
  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-border border-b px-4 py-2.5">
        <h3 className="font-mono text-muted-foreground text-xs">{id}</h3>
        <div className="flex items-center gap-2">
          <CopyButton
            value={install}
            label="Copy add command"
            variant="tertiary"
            size="tiny"
            showToast={false}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setShowCode((v) => !v)}>
            {showCode ? "Preview" : "Code"}
          </Button>
        </div>
      </header>
      {showCode ? (
        <DemoCode id={id} />
      ) : (
        <div className="flex min-h-56 items-center justify-center bg-background p-6">
          <LazyDemo id={id} />
        </div>
      )}
    </section>
  );
}

function EntryDetail({ entry }: { entry: CatalogEntry }) {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-5 p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-2xl text-foreground">{entry.title}</h2>
          <Badge variant={entry.status === "stable" ? "green-subtle" : "gray-subtle"} size="sm">
            {entry.status === "stable" ? "Stable" : "Experimental"}
          </Badge>
          <Badge variant="outline" size="sm">
            {categoryTitle.get(entry.category)}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          From <code className="font-mono text-foreground text-xs">{entry.import}</code>. Open a
          demo's code for the exact imports, or add it to a project with its command.
        </p>
      </div>
      {entry.demos.length === 0 ? (
        <p className="text-muted-foreground text-sm">This component has no demo yet.</p>
      ) : (
        entry.demos.map((id) => <DemoPanel key={id} id={id} />)
      )}
    </div>
  );
}

export function StudioFrame() {
  const [state, setState] = useState<FrameState>(INITIAL);
  usePaintedLook(state);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !isToFrame(event.data)) return;
      setState(event.data.state);
    };
    window.addEventListener("message", onMessage);
    post({ type: "studio:ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const open = (entry: string | null) => {
    setState((s) => ({ ...s, entry }));
    post({ type: "studio:open", entry });
    window.scrollTo({ top: 0 });
  };

  const current = state.entry ? CATALOG.find((e) => e.id === state.entry) : undefined;
  const groups = useMemo(() => {
    const visible = CATALOG.filter((e) => matches(e, state));
    return CATALOG_CATEGORIES.map((c) => ({
      ...c,
      entries: visible.filter((e) => e.category === c.id),
    })).filter((g) => g.entries.length > 0);
  }, [state]);

  if (current) return <EntryDetail entry={current} />;

  return (
    <div className="flex flex-col gap-8 p-6">
      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">No component matches “{state.query}”.</p>
      ) : null}
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <h2 className="font-medium text-muted-foreground text-xs">
            {group.title} <span className="tabular-nums">{group.entries.length}</span>
          </h2>
          <ul
            className={cn(
              "grid gap-4",
              "grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))]",
            )}
          >
            {group.entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onOpen={() => open(entry.id)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
