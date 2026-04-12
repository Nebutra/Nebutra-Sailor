"use client";

import { ArrowRight } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { projects as defaultProjects, type Project } from "@/lib/projects";
import { WorkGrid } from "./work-grid";

export function SelectedWorks({ projects: projectsProp }: { projects?: Project[] }) {
  const t = useTranslations("works");
  const allProjects = projectsProp ?? defaultProjects;
  const topProjects = allProjects.slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 border-t border-gray-100 dark:border-gray-800">
      <div className="text-center mb-16 flex flex-col items-center">
        <AnimateIn preset="fade" inView>
          <p className="font-serif italic text-2xl text-gray-400 mb-4 tracking-tight">
            {t("label")}
          </p>
        </AnimateIn>

        <AnimateIn preset="fadeUp" delay={0.1} inView>
          <h2 className="text-6xl md:text-7xl font-normal tracking-tight text-gray-900 dark:text-white mb-8">
            {t("headline")}
          </h2>
        </AnimateIn>

        <AnimateIn preset="fade" delay={0.2} inView>
          <Link
            href="/work"
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            {t("view_all", { count: allProjects.length })}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </AnimateIn>
      </div>

      <WorkGrid projects={topProjects} />
    </section>
  );
}
