import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
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
      <aside className="w-56 dark:border-gray-800 bg-white dark:bg-gray-950 flex shrink-0 flex-col border-r border-gray-100">
        <div className="px-5 py-6 dark:border-gray-800 border-b border-gray-100">
          <Link href="/admin" className="font-serif text-xl text-gray-900 dark:text-white italic">
            Admin
          </Link>
        </div>
        <AdminNav />
      </aside>

      {/* Main content */}
      <main className="bg-gray-50 dark:bg-gray-950 p-8 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
