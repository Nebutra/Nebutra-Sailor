"use client";

import { ClockRewind, CloudUpload } from "@nebutra/icons";
import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/ui/chip";
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
const MENU_H = 320;

/**
 * 添加节点 — one menu, three ways in: the dock's +, a double-click on empty canvas, and a node's
 * right + port (which wires the new node downstream). Lists only the node types the origin can
 * generate, then the two ways to bring media in: 上传 and 从生成历史选择.
 *
 * Positioned by hand rather than as a Popover: it opens at a point on the canvas (where the
 * double-click was), not against a trigger element.
 */
export function AddNodeMenu() {
  const request = useUiStore((s) => s.addMenu);
  const close = useUiStore((s) => s.closeAddMenu);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const setPromptFocus = useUiStore((s) => s.setPromptFocus);
  const createNode = useEditorStore((s) => s.createNode);
  const panel = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const pendingAt = useRef<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    const onDown = (e: PointerEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [request, close]);

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
  const left = request
    ? Math.min(Math.max(8, request.screen.x), window.innerWidth - MENU_W - 8)
    : 0;
  const above = request ? request.screen.y + MENU_H > window.innerHeight - 8 : false;

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
      {request && (
        <div
          ref={panel}
          role="menu"
          aria-label="添加节点"
          style={{
            left,
            top: above ? undefined : request.screen.y,
            bottom: above ? window.innerHeight - request.screen.y : undefined,
            width: MENU_W,
          }}
          className="para-rise fixed z-40 flex flex-col rounded-xl border border-border bg-popover p-1.5 shadow-ambient-lg"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-2 pt-1 pb-1.5 text-meta text-muted-foreground">
            {fromSource ? "添加下游节点" : "添加节点"}
          </div>
          {modes.map((m) => (
            <Chip
              key={m}
              role="menuitem"
              size="row"
              className="h-9 gap-2.5 text-body"
              onClick={() => add(m)}
            >
              <NodeGlyph type={m} className="size-4 text-muted-foreground" />
              {NODE_TYPE_LABEL[m]}
            </Chip>
          ))}
          {!fromSource && (
            <>
              <div className="px-2 pt-2.5 pb-1.5 text-meta text-muted-foreground">添加资源</div>
              {canUpload && (
                <Chip
                  role="menuitem"
                  size="row"
                  className="h-9 gap-2.5 text-body"
                  onClick={pickFile}
                >
                  <CloudUpload aria-hidden="true" className="size-4 text-muted-foreground" />
                  上传
                </Chip>
              )}
              <Chip
                role="menuitem"
                size="row"
                className="h-9 gap-2.5 text-body"
                onClick={() => {
                  close();
                  setHistoryOpen(true);
                }}
              >
                <ClockRewind aria-hidden="true" className="size-4 text-muted-foreground" />
                从生成历史选择
              </Chip>
            </>
          )}
        </div>
      )}
    </>
  );
}
