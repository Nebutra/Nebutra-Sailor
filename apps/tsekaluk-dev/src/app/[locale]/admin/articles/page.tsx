import { AnimateIn } from "@nebutra/ui/components";
import { FileText, Plus } from "lucide-react";
import { getArticles } from "@/lib/articles";

export default async function AdminArticlesPage() {
  const articles = getArticles();

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-serif italic text-gray-400 dark:text-gray-500 text-sm">
            Read-only — articles are MDX files
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">Articles</h1>
        </div>
        <a
          href="https://github.com/TsekaLuk/tsekaluk-dev/tree/main/content/thinking"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Article
        </a>
      </div>

      <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        Articles are managed as MDX files in{" "}
        <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
          content/thinking/
        </code>
        . To add a new article, create a new{" "}
        <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
          .mdx
        </code>{" "}
        file with frontmatter fields:{" "}
        <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
          title
        </code>
        ,{" "}
        <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
          date
        </code>
        ,{" "}
        <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
          excerpt
        </code>
        ,{" "}
        <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
          tags
        </code>
        .
      </div>

      {articles.length === 0 ? (
        <AnimateIn preset="fade">
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No articles yet. Create your first MDX file in{" "}
              <code className="font-mono text-xs">content/thinking/</code>.
            </p>
          </div>
        </AnimateIn>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {articles.map((article) => (
                <tr
                  key={article.slug}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                    {article.title}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {article.date}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {article.slug}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 text-xs text-gray-400">
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
