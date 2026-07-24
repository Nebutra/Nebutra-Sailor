import { unstable_cache } from "next/cache";

/**
 * Fetch live GitHub star count with ISR revalidation.
 * Falls back to hardcoded value when API is unavailable or GITHUB_TOKEN not set.
 */
const FALLBACK_STARS = 1247;
const REPO = "nebutra/sailor";

export const getGitHubStars = unstable_cache(
  async (): Promise<number> => {
    try {
      const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" };
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }
      const res = await fetch(`https://api.github.com/repos/${REPO}`, {
        headers,
      });
      if (!res.ok) return FALLBACK_STARS;
      const data = await res.json();
      return typeof data.stargazers_count === "number" ? data.stargazers_count : FALLBACK_STARS;
    } catch {
      return FALLBACK_STARS;
    }
  },
  ["github-stars"],
  { revalidate: 3600 },
);
