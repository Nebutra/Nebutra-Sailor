"use client";

/**
 * Single | Batch tab shell for tools that declare batch metadata.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { type BatchAccept, BatchQueue, type BatchResultKind } from "@/components/batch-queue";

export function BatchWorkspace({
  toolId,
  accept,
  resultKind,
  maxItems,
  buildItemInput,
  sharedHint,
  children,
}: {
  toolId: string;
  accept: BatchAccept;
  resultKind: BatchResultKind;
  maxItems?: number;
  buildItemInput: (raw: File | string) => unknown | Promise<unknown>;
  sharedHint?: string;
  children: ReactNode;
}) {
  const t = useTranslations("runners.common");
  return (
    <Tabs defaultValue="single" className="space-y-4">
      <TabsList>
        <TabsTrigger value="single">{t("single")}</TabsTrigger>
        <TabsTrigger value="batch">{t("batch")}</TabsTrigger>
      </TabsList>
      <TabsContent value="single" className="space-y-4">
        {children}
      </TabsContent>
      <TabsContent value="batch">
        <BatchQueue
          toolId={toolId}
          accept={accept}
          resultKind={resultKind}
          {...(maxItems !== undefined ? { maxItems } : {})}
          buildItemInput={buildItemInput}
          {...(sharedHint !== undefined ? { sharedHint } : {})}
        />
      </TabsContent>
    </Tabs>
  );
}
