import { HomeTopBar } from "@/components/home/home-top-bar";
import { PromptDropZone } from "@/components/home/prompt-drop-zone";
import { RecentProjects } from "@/components/home/recent-projects";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <HomeTopBar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 pb-24">
        <h1 className="mb-8 text-center font-medium text-display text-foreground tracking-tight">
          What are you making?
        </h1>
        <PromptDropZone />
        <RecentProjects />
      </main>
    </div>
  );
}
