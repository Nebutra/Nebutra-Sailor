"use client";

import { CommandMenu as Menu } from "@nebutra/ui/primitives";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { projects, workspaces } from "@/mock/data";
import { useUiStore } from "@/stores/ui-store";

/** Cmd/Ctrl+K reaches every major entry point, so the chrome can stay nearly empty. */
export function CommandMenu() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const setDrawer = useUiStore((s) => s.setDrawer);
  const setAgent = useUiStore((s) => s.setAgent);
  const router = useRouter();
  const pathname = usePathname();
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
    <Menu.Root open={open} setOpen={setOpen} label="PARA commands">
      <Menu.Input placeholder="Search or jump to…" />
      <Menu.List>
        <Menu.Empty>Nothing matches.</Menu.Empty>
        <Menu.Group heading="Go">
          <Menu.Item value="go home" callback={go("/")}>
            Go Home
          </Menu.Item>
          <Menu.Item value="open projects" callback={go("/projects")}>
            Open Projects
          </Menu.Item>
        </Menu.Group>
        <Menu.Group heading="Workspaces">
          {workspaces.map((w) => (
            <Menu.Item
              key={w.id}
              value={`workspace ${nameOf(w.projectId)} ${w.name}`}
              callback={go(`/p/${w.projectId}/w/${w.id}`)}
            >
              <span className="text-muted-foreground">{nameOf(w.projectId)}</span>
              <span className="mx-1.5 text-neutral-7">/</span>
              {w.name}
            </Menu.Item>
          ))}
        </Menu.Group>
        <Menu.Group heading="Actions">
          <Menu.Item
            value="ask para"
            callback={() => {
              if (!inWorkspace) router.push("/p/last-animal/w/ep01");
              setDrawer("agent");
              setAgent({ status: "composing" });
            }}
          >
            Ask PARA
          </Menu.Item>
          <Menu.Item
            value="open assets library"
            callback={() => {
              if (!inWorkspace) router.push("/p/last-animal/w/ep01");
              setDrawer("library");
            }}
          >
            Open Assets
          </Menu.Item>
          <Menu.Item value="create workspace">Create Workspace</Menu.Item>
        </Menu.Group>
      </Menu.List>
    </Menu.Root>
  );
}
