"use client";

import { CommandMenu as Menu } from "@nebutra/ui/primitives";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCreateCanvas } from "@/lib/create-canvas";
import { projects, workspaces } from "@/mock/data";
import { useUiStore } from "@/stores/ui-store";

/** ⌘K reaches every major entry point, so the chrome can stay nearly empty. */
export function CommandMenu() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const setAgentOpen = useUiStore((s) => s.setAgentOpen);
  const setAssetsOpen = useUiStore((s) => s.setAssetsOpen);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const setAgent = useUiStore((s) => s.setAgent);
  const router = useRouter();
  const pathname = usePathname();
  const { create } = useCreateCanvas();
  const inWorkspace = /^\/p\/[^/]+\/w\/[^/]+/.test(pathname);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (href: string) => () => router.push(href);
  const nameOf = (projectId: string) => projects.find((p) => p.id === projectId)?.name ?? projectId;

  return (
    <Menu.Root open={open} setOpen={setOpen} label="PARA 命令">
      <Menu.Input placeholder="搜索或跳转…" />
      <Menu.List>
        <Menu.Empty>没有匹配的命令</Menu.Empty>
        <Menu.Group heading="前往">
          <Menu.Item value="首页 home" callback={go("/")}>
            首页
          </Menu.Item>
          <Menu.Item value="我的项目 projects" callback={go("/projects")}>
            我的项目
          </Menu.Item>
          <Menu.Item value="我的资产 assets" callback={go("/assets")}>
            我的资产
          </Menu.Item>
        </Menu.Group>
        <Menu.Group heading="画布">
          {workspaces.map((w) => (
            <Menu.Item
              key={w.id}
              value={`画布 workspace ${nameOf(w.projectId)} ${w.name}`}
              callback={go(`/p/${w.projectId}/w/${w.id}`)}
            >
              <span className="text-muted-foreground">{nameOf(w.projectId)}</span>
              <span className="mx-1.5 text-neutral-7">/</span>
              {w.name}
            </Menu.Item>
          ))}
        </Menu.Group>
        {inWorkspace && (
          <Menu.Group heading="当前画布">
            <Menu.Item
              value="agent 对话 ask"
              callback={() => {
                setAgentOpen(true);
                setAgent({ status: "composing" });
              }}
            >
              打开 Agent
            </Menu.Item>
            <Menu.Item value="资产管理 assets library" callback={() => setAssetsOpen(true)}>
              打开资产管理
            </Menu.Item>
            <Menu.Item value="生成历史 history" callback={() => setHistoryOpen(true)}>
              打开生成历史
            </Menu.Item>
          </Menu.Group>
        )}
        <Menu.Group heading="新建">
          <Menu.Item value="新建项目 new project canvas" callback={() => void create("blank")}>
            新建项目
          </Menu.Item>
        </Menu.Group>
      </Menu.List>
    </Menu.Root>
  );
}
