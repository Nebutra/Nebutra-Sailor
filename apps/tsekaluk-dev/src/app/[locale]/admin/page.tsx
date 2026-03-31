import { AnimateIn } from "@nebutra/ui/components";
import { FileText, FolderOpen, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import { getArticles } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { projects } from "@/lib/projects";

export default async function AdminDashboardPage() {
  const articles = getArticles();
  const projectCount = projects.length;
  const articleCount = articles.length;

  const [pendingCount, feedbackCount] = prisma
    ? await Promise.all([
        prisma.guestbook.count({ where: { status: "pending" } }).catch(() => 0),
        prisma.feedback.count().catch(() => 0),
      ])
    : [0, 0];

  const stats = [
    {
      label: "Projects",
      value: projectCount,
      icon: FolderOpen,
      href: "/admin/projects",
      badge: null,
    },
    {
      label: "Articles",
      value: articleCount,
      icon: FileText,
      href: "/admin/articles",
      badge: null,
    },
    {
      label: "Guestbook",
      value: pendingCount,
      icon: MessageSquare,
      href: "/admin/guestbook",
      badge: pendingCount > 0 ? `${pendingCount} pending` : null,
    },
    {
      label: "Feedback",
      value: feedbackCount,
      icon: Star,
      href: "/admin/feedback",
      badge: null,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="font-serif italic text-gray-400 dark:text-gray-500 text-sm">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <AnimateIn key={stat.label} preset="fadeUp">
              <Link
                href={stat.href}
                className="block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                      <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
                  </div>
                  {stat.badge && (
                    <span className="inline-flex rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                      {stat.badge}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
              </Link>
            </AnimateIn>
          );
        })}
      </div>
    </div>
  );
}
