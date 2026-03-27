import { Unicorn404 } from "@/components/landing/404/Unicorn404";

// Global fallback for routes that don't match a locale (e.g. /wrong)
export default function GlobalNotFound() {
  return (
    <main className="flex-grow flex flex-col">
      <Unicorn404
        title="Page Not Found"
        desc="The page you are looking for might have been removed or is temporarily unavailable."
        homeText="Return Home"
        docsText="Read Documentation"
      />
    </main>
  );
}
