import { useEditorStore } from "./editor-store";

/**
 * Screen ↔ canvas coordinates for chrome that lives outside the React Flow tree (the dock, the
 * history dialog, the asset panel). The canvas registers its element; the transform is the
 * document viewport the editor store already keeps.
 */

let stage: HTMLElement | null = null;

export function registerStage(el: HTMLElement | null): void {
  stage = el;
}

export function stageRect(): { left: number; top: number; width: number; height: number } {
  const r = stage?.getBoundingClientRect();
  if (r) return { left: r.left, top: r.top, width: r.width, height: r.height };
  const w = typeof window === "undefined" ? 1200 : window.innerWidth;
  const h = typeof window === "undefined" ? 700 : window.innerHeight;
  return { left: 0, top: 0, width: w, height: h };
}

/** A viewport (client) point in canvas coordinates. */
export function clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const vp = useEditorStore.getState().document?.viewport ?? { x: 0, y: 0, zoom: 1 };
  const r = stageRect();
  return { x: (clientX - r.left - vp.x) / vp.zoom, y: (clientY - r.top - vp.y) / vp.zoom };
}

/** The canvas point at the centre of what the stage shows. */
export function viewCenter(): { x: number; y: number } {
  const r = stageRect();
  return clientToCanvas(r.left + r.width / 2, r.top + r.height / 2);
}
