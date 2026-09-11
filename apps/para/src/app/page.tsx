import { HomeTopBar } from "@/components/home/home-top-bar";
import { PromptDropZone } from "@/components/home/prompt-drop-zone";
import { RecentProjects } from "@/components/home/recent-projects";

/**
 * The launcher.
 *
 * One vertical axis. The question and its composer keep a reading measure — a 1248px-wide input is
 * not a nicer input — but they start at the same left edge as the work below rather than being
 * centred inside the wider column. Two different left edges with nothing aligning them read as an
 * accident, which is what this surface looked like: a composer floating in the middle of a grid.
 *
 * Top-aligned, not vertically centred. Centring made the whole page drift with the viewport height
 * and put ~180px of nothing above the first word.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <HomeTopBar />
      <main className="mx-auto w-full max-w-para-surface flex-1 px-6 pt-24 pb-24">
        <div className="max-w-para-focus">
          <h1 className="mb-5 font-medium text-display text-foreground tracking-tight">
            What are you making?
          </h1>
          <PromptDropZone />
        </div>
        <RecentProjects />
      </main>
    </div>
  );
}
