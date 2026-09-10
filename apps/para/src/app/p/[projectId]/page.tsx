import { HomeTopBar } from "@/components/home/home-top-bar";
import { ProjectOverview } from "@/components/home/project-overview";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="flex min-h-full flex-col">
      <HomeTopBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pt-16 pb-24">
        <ProjectOverview projectId={projectId} />
      </main>
    </div>
  );
}
