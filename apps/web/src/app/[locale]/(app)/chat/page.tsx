import { AnimateIn } from "@nebutra/ui/components";
import { PageHeader } from "@nebutra/ui/layout";
import { ChatInterface } from "@/components/chat/chat-interface";

interface ChatPageProps {
  searchParams?: Promise<{ sessionId?: string; mode?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const resolved = searchParams ? await searchParams : {};
  return (
    <section className="mx-auto w-full max-w-4xl">
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="AI Assistant"
          description="Chat with Sailor — your AI-powered SaaS assistant"
        />
      </AnimateIn>
      <AnimateIn preset="fadeUp">
        <ChatInterface initialSessionId={resolved.sessionId} initialMode={resolved.mode} />
      </AnimateIn>
    </section>
  );
}
