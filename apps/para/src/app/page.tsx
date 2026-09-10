import { HomeTopBar } from "@/components/home/home-top-bar";
import { PromptDropZone } from "@/components/home/prompt-drop-zone";
import { RecentProjects } from "@/components/home/recent-projects";

/**
 * The launcher. Two measures, not one: the question and its composer are a reading width, because
 * that is what a single focused input wants; the grid of work is not, and constraining it to the
 * same 896px column was why the surface sat in the middle of the viewport with the rest empty.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <HomeTopBar />
      <main className="mx-auto flex w-full max-w-para-surface flex-1 flex-col justify-center px-6 pb-24">
        <div className="mx-auto w-full max-w-para-focus">
          <h1 className="mb-8 text-center font-medium text-display text-foreground tracking-tight">
            What are you making?
          </h1>
          <PromptDropZone />
        </div>
        <RecentProjects />
      </main>
    </div>
  );
}
