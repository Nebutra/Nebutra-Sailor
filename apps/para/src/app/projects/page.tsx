import { HomeTopBar } from "@/components/home/home-top-bar";
import { ProjectsList } from "@/components/home/projects-list";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <HomeTopBar />
      <main className="mx-auto w-full max-w-para-surface flex-1 px-6 pt-24 pb-24">
        <ProjectsList />
      </main>
    </div>
  );
}
