import { AnimateIn } from "@nebutra/ui/components";
import { PageHeader } from "@nebutra/ui/layout";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="AI Assistant"
          description="Chat with Sailor — your AI-powered SaaS assistant"
        />
      </AnimateIn>
      <AnimateIn preset="fadeUp">
        <ChatInterface />
      </AnimateIn>
    </section>
  );
}
