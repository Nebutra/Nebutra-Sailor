"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/mock/queries";

export function NewWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void api.createWorkspace(projectId).then((ws) => {
      void qc.invalidateQueries({ queryKey: ["workspaces", projectId] });
      router.replace(`/p/${projectId}/w/${ws.id}`);
    });
  }, [projectId, qc, router]);
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground text-body">
      Creating…
    </div>
  );
}
