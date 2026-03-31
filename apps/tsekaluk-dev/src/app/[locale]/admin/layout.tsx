import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = session.user.email;

  if (!adminEmail || userEmail?.toLowerCase() !== adminEmail.toLowerCase()) {
    return (
      <div className="px-6 flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-5xl text-gray-300 italic dark:text-gray-700">403</p>
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You do not have permission to access the admin panel.
          </p>
          <Link
            href="/"
            className="mt-6 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white inline-block underline"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 dark:border-gray-800 bg-white dark:bg-gray-950 flex shrink-0 flex-col border-r border-gray-100 justify-between">
        <div>
          <div className="px-5 py-6 dark:border-gray-800 border-b border-gray-100">
            <Link href="/admin" className="font-serif text-xl text-gray-900 dark:text-white italic">
              Admin
            </Link>
          </div>
          <AdminNav />
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="bg-gray-50 dark:bg-gray-950 p-8 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
