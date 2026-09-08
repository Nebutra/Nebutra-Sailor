"use client";

import { Plus } from "@nebutra/icons";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/stores/ui-store";

/** One Create entry point (secondary to the composer at rest — A). Zero-step workspace create (A). */
export function CreateMenu({
  inWorkspace = false,
  projectId,
}: {
  inWorkspace?: boolean;
  projectId?: string;
}) {
  const setDrawer = useUiStore((s) => s.setDrawer);
  const setAgent = useUiStore((s) => s.setAgent);
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="square"
          iconSize="md"
          aria-label="Create"
        >
          <Plus className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem disabled>New project</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/p/${projectId ?? "last-animal"}/w/new`)}>
          New workspace
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => inWorkspace && setDrawer("library")}>
          Import asset
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Create subject</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setDrawer("agent");
            setAgent({ status: "composing" });
          }}
        >
          Ask PARA
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
