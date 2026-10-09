import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { AgentComposer } from "@/components/home/agent-composer";
import { AssetGallery } from "@/components/home/asset-gallery";
import { LaunchHero } from "@/components/home/launch-hero";
import { RecentProjects } from "@/components/home/recent-projects";

export const metadata = { title: "首页" };

/**
 * 首页, in LibTV's order: start something (新建画布创作 beside the model and tool launchers), pick
 * up where you left off (最近项目), ask the agent or start from a template (the composer), then
 * everything you have made (我的作品, where LibTV has TV Show — PARA has no community feed).
 */
export default function HomePage() {
  return (
    <AnimateInGroup stagger="fast" className="flex flex-col gap-10">
      <AnimateIn preset="fadeUp">
        <LaunchHero />
      </AnimateIn>
      <AnimateIn preset="fadeUp">
        <RecentProjects />
      </AnimateIn>
      <AnimateIn preset="fadeUp">
        <AgentComposer />
      </AnimateIn>
      <AnimateIn preset="fadeUp">
        <AssetGallery heading="我的作品" level={2} limit={16} />
      </AnimateIn>
    </AnimateInGroup>
  );
}
