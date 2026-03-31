import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { AgentWidget } from "@/components/ui/agent-widget";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content" className="relative z-0">
        <div className="absolute inset-x-0 top-0 h-[900px] bg-gradient-to-b from-[var(--color-accent)]/20 via-[var(--color-accent)]/5 to-transparent dark:from-[var(--color-accent)]/8 dark:via-transparent -z-10 pointer-events-none" />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full max-w-7xl h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--color-accent)]/15 via-transparent to-transparent dark:from-[var(--color-accent)]/8 rounded-full blur-3xl pointer-events-none -z-10 opacity-50" />
        {children}
      </main>
      <Footer />
      <AgentWidget />
    </>
  );
}
