import { generatableModes } from "@/domain/generation";
import { availableTemplates, buildTemplate, type TemplateId } from "@/domain/templates";
import { isGatewayMode } from "@/lib/gateway-api";
import { stageRect } from "./canvas-geometry";
import { nextId, useEditorStore } from "./editor-store";
import { useUiStore } from "./ui-store";

/**
 * Build a template into the open document — from a starter card, or once from `?template=`.
 * Centred on what the stage shows; the template's first node is selected with its prompt focused.
 *
 * A template whose nodes the origin cannot generate (video, before the video seat is live in
 * gateway mode) is not built: a graph whose 生成 can only fail is a dead link with extra steps.
 */
export function applyTemplate(id: TemplateId): boolean {
  const editor = useEditorStore.getState();
  if (!editor.document) return false;
  if (!availableTemplates(generatableModes(isGatewayMode)).some((t) => t.id === id)) return false;
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
