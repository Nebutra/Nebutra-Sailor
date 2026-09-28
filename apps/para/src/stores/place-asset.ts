import { NODE_SIZE, sizeForAspect } from "@/domain/nodes";
import type { Asset, WorkspaceNode } from "@/domain/types";
import { nextId, useEditorStore } from "./editor-store";

/**
 * An existing asset becomes a node on the canvas — from 上传, 从生成历史选择, the 资产管理 panel or a
 * file dropped from the desktop. Centred on `at`, sized by the asset's aspect, selected.
 */
export function placeAsset(asset: Asset, at: { x: number; y: number }): string | null {
  const editor = useEditorStore.getState();
  if (!editor.document) return null;
  const size = asset.type === "audio" ? NODE_SIZE.audio : sizeForAspect(asset.type, asset.aspect);
  const node: WorkspaceNode = {
    id: nextId(),
    type: asset.type,
    assetId: asset.id,
    status: "completed",
    createdBy: "import",
    x: Math.round(at.x - size.width / 2),
    y: Math.round(at.y - size.height / 2),
    ...size,
  };
  editor.addNode(node);
  editor.select([node.id]);
  return node.id;
}
