import { AnimateIn } from "@nebutra/ui/components";
import { PageHeader } from "@nebutra/ui/layout";
import { Plus } from "lucide-react";
import { ChatHistoryList, type ChatHistoryRow } from "@/components/chat/chat-history-list";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ChatHistoryPage() {
  let orgId: string | null = null;
  let userId: string | null = null;

  try {
    const auth = await getAuth();
    orgId = auth?.orgId ?? null;
    userId = auth?.userId ?? null;
  } catch {
    // Auth failed — fall through to empty state.
  }

  const sessions =
    orgId && userId
      ? await db.chatSession
          .findMany({
            where: { organizationId: orgId, userId },
            orderBy: { lastMessageAt: "desc" },
            take: 100,
            select: {
              id: true,
              title: true,
              mode: true,
              messageCount: true,
              lastMessageAt: true,
              createdAt: true,
            },
          })
          .catch(() => [])
      : [];

  const rows: ChatHistoryRow[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    mode: s.mode,
    messageCount: s.messageCount,
    lastMessageAt: s.lastMessageAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <section className="mx-auto w-full max-w-6xl">
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Chat history"
          description={`${rows.length} session${rows.length === 1 ? "" : "s"} · most recent first`}
          actions={
            <ViewTransitionLink
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--brand-gradient)" }}
            >
              <Plus className="h-3 w-3" />
              New chat
            </ViewTransitionLink>
          }
        />
      </AnimateIn>

      <div className="mt-6">
        <ChatHistoryList initialSessions={rows} />
      </div>
    </section>
  );
}
