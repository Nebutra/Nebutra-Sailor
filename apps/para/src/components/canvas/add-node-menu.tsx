"use client";

import { ClockRewind, CloudUpload } from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { useRef, useState } from "react";
import { generatableModes } from "@/domain/generation";
import { NODE_SIZE, NODE_TYPE_LABEL } from "@/domain/nodes";
import type { GeneratorMode } from "@/domain/types";
import { isGatewayMode } from "@/lib/gateway-api";
import { canUpload, mediaTypeOf, UPLOAD_ACCEPT, uploadAsset } from "@/lib/uploads";
import { useEditorStore } from "@/stores/editor-store";
import { placeAsset } from "@/stores/place-asset";
import { useUiStore } from "@/stores/ui-store";
import { NodeGlyph } from "./node-glyph";

const MODES = generatableModes(isGatewayMode);
const ORDER: readonly GeneratorMode[] = ["text", "image", "video", "audio"];
const MENU_W = 224;

/**
 * 添加节点 — one menu, three ways in: the dock's +, a double-click on empty canvas, and a node's
 * right + port (which wires the new node downstream). Lists only the node types the origin can
 * generate, then the two ways to bring media in: 上传 and 从生成历史选择.
 *
 * It opens at a point on the canvas (where the double-click was) rather than against a button, so
 * the design system's DropdownMenu is anchored to an invisible 1px trigger placed at that point —
 * focus, keyboard, outside-click, Escape and the portal come from the primitive, not by hand.
 */
export function AddNodeMenu() {
  const request = useUiStore((s) => s.addMenu);
  const close = useUiStore((s) => s.closeAddMenu);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const setPromptFocus = useUiStore((s) => s.setPromptFocus);
  const createNode = useEditorStore((s) => s.createNode);
  const file = useRef<HTMLInputElement>(null);
  const pendingAt = useRef<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (mode: GeneratorMode) => {
    if (!request) return;
    const size = NODE_SIZE[mode];
    const doc = useEditorStore.getState().document;
    const source = request.sourceId ? doc?.nodes[request.sourceId] : undefined;
    // From a port the new node sits to the right of its source, centred on it; elsewhere it is
    // centred on the point the menu was opened for.
    const at = source
      ? { x: source.x + source.width + 96, y: source.y + source.height / 2 - size.height / 2 }
      : { x: request.flow.x - size.width / 2, y: request.flow.y - size.height / 2 };
    const id = createNode({ mode, at, ...(source ? { sourceId: source.id } : {}) });
    if (id) setPromptFocus(id);
    close();
  };

  const pickFile = () => {
    pendingAt.current = request?.flow ?? null;
    close();
    file.current?.click();
  };

  const onFile = async (f: File | undefined) => {
    const at = pendingAt.current;
    if (!f || !at) return;
    if (!mediaTypeOf(f)) {
      setError("只支持图片和视频");
      return;
    }
    setError(null);
    try {
      const { documentId, projectId } = useEditorStore.getState();
      const asset = await uploadAsset(f, { projectId, workspaceId: documentId });
      placeAsset(asset, at);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    }
  };

  const fromSource = Boolean(request?.sourceId);
  const modes = ORDER.filter((m) => MODES.includes(m));
  return (
    <>
      <input
        data-allow-native
        ref={file}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <div
          role="status"
          className="-translate-x-1/2 fixed bottom-24 left-1/2 z-40 rounded-lg border border-border bg-popover px-3 py-2 text-destructive-strong text-label shadow-ambient-md"
        >
          {error}
        </div>
      )}
      <DropdownMenu open={Boolean(request)} onOpenChange={(open) => open || close()}>
        <DropdownMenuTrigger
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none fixed size-px opacity-0"
          style={request ? { left: request.screen.x, top: request.screen.y } : undefined}
        />
        <DropdownMenuContent
          align="start"
          sideOffset={0}
          aria-label="添加节点"
          style={{ width: MENU_W }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel>{fromSource ? "添加下游节点" : "添加节点"}</DropdownMenuLabel>
          {modes.map((m) => (
            <DropdownMenuItem key={m} className="gap-2.5" onClick={() => add(m)}>
              <NodeGlyph type={m} className="size-4 text-muted-foreground" />
              {NODE_TYPE_LABEL[m]}
            </DropdownMenuItem>
          ))}
          {!fromSource && (
            <>
              <DropdownMenuLabel className="pt-2.5">添加资源</DropdownMenuLabel>
              {canUpload && (
                <DropdownMenuItem className="gap-2.5" onClick={pickFile}>
                  <CloudUpload aria-hidden="true" className="size-4 text-muted-foreground" />
                  上传
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="gap-2.5"
                onClick={() => {
                  close();
                  setHistoryOpen(true);
                }}
              >
                <ClockRewind aria-hidden="true" className="size-4 text-muted-foreground" />
                从生成历史选择
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
