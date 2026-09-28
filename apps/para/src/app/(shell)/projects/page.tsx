import { ProjectsList } from "@/components/home/projects-list";

export const metadata = { title: "项目" };

export default function ProjectsPage() {
  return (
    <div className="pt-2">
      <ProjectsList />
    </div>
  );
}
