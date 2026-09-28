import { ProjectsList } from "@/components/home/projects-list";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="pt-8">
      <ProjectsList />
    </div>
  );
}
