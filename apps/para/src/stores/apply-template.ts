import { buildTemplate, type TemplateId } from "@/domain/templates";
import { stageRect } from "./canvas-geometry";
import { nextId, useEditorStore } from "./editor-store";
import { useUiStore } from "./ui-store";

/**
 * Build a template into the open document — from a starter card, or once from `?template=`.
 * Centred on what the stage shows; the template's first node is selected with its prompt focused.
 */
export function applyTemplate(id: TemplateId): boolean {
  const editor = useEditorStore.getState();
  if (!editor.document) return false;
  const r = stageRect();
  const graph = buildTemplate(id, nextId, editor.document.viewport, {
    width: r.width,
    height: r.height,
  });
  editor.addGraph(graph.nodes, graph.edges);
  editor.select([graph.focusId]);
  useUiStore.getState().setPromptFocus(graph.focusId);
  return true;
}
