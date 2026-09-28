import { AssetGallery } from "@/components/home/asset-gallery";
import { NewCanvasHero } from "@/components/home/new-canvas-hero";
import { RecentProjects } from "@/components/home/recent-projects";
import { ToolTiles } from "@/components/home/tool-tiles";

/**
 * Home, in LibTV's order: start something (the New canvas hero), start something specific (tool
 * tiles), pick up where you left off (Recent), then everything you have made (Your work).
 *
 * There is no prompt composer here any more — LibTV's home has none, and the agent composer lives
 * on the canvas, one click away through the sidebar's Agent entry.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <NewCanvasHero />
      <ToolTiles />
      <RecentProjects />
      <AssetGallery heading="Your work" level={2} limit={12} />
    </div>
  );
}
