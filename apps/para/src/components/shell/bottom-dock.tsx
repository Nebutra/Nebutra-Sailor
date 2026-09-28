"use client";

import {
  ArrowMove,
  ClockRewind,
  Command,
  Cursor,
  Plus,
  Question,
  SidebarLeft,
} from "@nebutra/icons";
import {
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@nebutra/ui/primitives";
import { useReactFlow, useViewport } from "@xyflow/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { viewCenter } from "@/stores/canvas-geometry";
import { useUiStore } from "@/stores/ui-store";

/** One icon control of the dock, with its name in a tooltip (the dock is icons only, as LibTV's). */
function DockButton({
  label,
  pressed,
  onClick,
  children,
  className = "",
}: {
  label: string;
  pressed?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Chip
          aria-label={label}
          {...(pressed !== undefined ? { pressed, "aria-pressed": pressed } : {})}
          {...(onClick ? { onClick } : {})}
          className={`size-9 h-9 justify-center rounded-lg p-0 ${className}`}
        >
          {children}
        </Chip>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

const SHORTCUTS: Array<[string, ReactNode]> = [
  ["添加节点", <Kbd key="dbl">双击画布</Kbd>],
  ["选择工具", <Kbd key="v">V</Kbd>],
  ["抓手工具", <Kbd key="h">H</Kbd>],
  ["临时拖动画布", <Kbd key="space">Space</Kbd>],
  [
    "创建副本",
    <Kbd key="d" meta>
      D
    </Kbd>,
  ],
  ["删除节点或连线", <Kbd key="del">⌫</Kbd>],
  [
    "生成",
    <Kbd key="enter" meta>
      Enter
    </Kbd>,
  ],
  [
    "全部命令",
    <Kbd key="k" meta>
      K
    </Kbd>,
  ],
  ["取消选择", <Kbd key="esc">Esc</Kbd>],
];

/**
 * The floating dock at the bottom centre (LibTV): 添加节点 · 选择 / 抓手 · 生成历史 · 快捷键 · 帮助,
 * and the bottom-left cluster: 资产管理 and the zoom level. Canvas view only.
 */
export function BottomDock() {
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const addMenu = useUiStore((s) => s.addMenu);
  const openAddMenu = useUiStore((s) => s.openAddMenu);
  const closeAddMenu = useUiStore((s) => s.closeAddMenu);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const addFromDock = addMenu?.origin === "dock";

  return (
    <>
      <BottomLeft />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
        <div className="para-rise pointer-events-auto flex h-[var(--para-dock-h)] items-center gap-1 rounded-xl border border-border/60 bg-popover/90 px-1.5 shadow-ambient-md backdrop-blur-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <Chip
                tone="primary"
                aria-label="添加节点"
                aria-expanded={addFromDock}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  if (addFromDock) {
                    closeAddMenu();
                    return;
                  }
                  const r = e.currentTarget.getBoundingClientRect();
                  openAddMenu({
                    screen: { x: r.left - 8, y: r.top - 10 },
                    flow: viewCenter(),
                    origin: "dock",
                  });
                }}
                className="size-9 h-9 justify-center rounded-lg p-0"
              >
                <Plus className={`size-4 transition-transform ${addFromDock ? "rotate-45" : ""}`} />
              </Chip>
            </TooltipTrigger>
            <TooltipContent side="top">添加节点</TooltipContent>
          </Tooltip>
          <DockButton
            label="选择 (V)"
            pressed={tool === "select"}
            onClick={() => setTool("select")}
          >
            <Cursor className="size-4" />
          </DockButton>
          <DockButton label="抓手 (H)" pressed={tool === "hand"} onClick={() => setTool("hand")}>
            <ArrowMove className="size-4" />
          </DockButton>
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
          <DockButton label="生成历史" onClick={() => setHistoryOpen(true)}>
            <ClockRewind className="size-4" />
          </DockButton>
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
          <Popover>
            <PopoverTrigger asChild>
              <Chip aria-label="快捷键" className="size-9 h-9 justify-center rounded-lg p-0">
                <Command className="size-4" />
              </Chip>
            </PopoverTrigger>
            <PopoverContent side="top" align="center" className="w-72 p-3">
              <div className="mb-2 font-medium text-body text-foreground">快捷键</div>
              <ul className="flex flex-col gap-1.5">
                {SHORTCUTS.map(([label, keys]) => (
                  <li key={label} className="flex items-center justify-between text-label">
                    <span className="text-muted-foreground">{label}</span>
                    {keys}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Chip aria-label="帮助" className="size-9 h-9 justify-center rounded-lg p-0">
                <Question className="size-4" />
              </Chip>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-52 p-1.5">
              <Chip size="row" onClick={() => setCommandOpen(true)}>
                全部命令
              </Chip>
              <Link
                href="/pro"
                className="flex h-[var(--para-h-chip)] w-full items-center rounded-md px-2 text-foreground text-label hover:bg-accent"
              >
                会员与积分
              </Link>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
}

function BottomLeft() {
  const assetsOpen = useUiStore((s) => s.assetsOpen);
  const setAssetsOpen = useUiStore((s) => s.setAssetsOpen);
  const { zoom } = useViewport();
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  return (
    <div className="pointer-events-auto absolute bottom-5 left-4 z-20 flex items-center gap-1">
      {!assetsOpen && (
        <Chip tone="muted" onClick={() => setAssetsOpen(true)} className="h-9 gap-1.5 px-2.5">
          <SidebarLeft className="size-4" />
          资产管理
        </Chip>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Chip tone="muted" aria-label="缩放" className="h-9 px-2.5 tabular-nums">
            {Math.round(zoom * 100)}%
          </Chip>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-40 p-1.5">
          <Chip size="row" onClick={() => void zoomIn({ duration: 150 })}>
            放大
          </Chip>
          <Chip size="row" onClick={() => void zoomOut({ duration: 150 })}>
            缩小
          </Chip>
          <Chip size="row" onClick={() => void zoomTo(1, { duration: 150 })}>
            缩放至 100%
          </Chip>
          <Chip size="row" onClick={() => void fitView({ duration: 200, padding: 0.2 })}>
            适应画布
          </Chip>
        </PopoverContent>
      </Popover>
    </div>
  );
}
