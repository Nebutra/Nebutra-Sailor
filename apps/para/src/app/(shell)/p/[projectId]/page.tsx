import { ProjectOverview } from "@/components/home/project-overview";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="pt-8">
      <ProjectOverview projectId={projectId} />
    </div>
  );
}
