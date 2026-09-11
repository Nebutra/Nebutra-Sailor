import { ProjectCardSkeleton } from "@/components/home/project-card";
import { CardGrid } from "./card-grid";

/** Loading shape for a CardGrid, so the layout does not jump when the data lands. */
export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <CardGrid>
      {Array.from({ length: count }, (_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </CardGrid>
  );
}
