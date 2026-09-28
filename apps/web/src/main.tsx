import { brand } from "@nebutra/brand";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import { BrowserAuthProvider } from "@/vite-app/auth-provider";
import { queryClient } from "@/vite-app/query-client";
import { router } from "@/vite-app/router";

// index.html is static; the tab carries the project's own name (brand.config.ts).
document.title = brand.name;

/**
 * Dark follows the OS unless the user picked a theme (next-themes' `theme`
 * key, shared with the rest of the product). The tokens and every component
 * key dark mode off a `.dark` ancestor; nothing set it in the Vite app, so it
 * rendered light on a dark system.
 */
function followColorScheme(): void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem("theme");
    } catch {
      // storage blocked: follow the OS
    }
    const dark = stored === "dark" || (stored !== "light" && media.matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  };
  apply();
  media.addEventListener("change", apply);
}

followColorScheme();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element for Product App.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserAuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </BrowserAuthProvider>
  </StrictMode>,
);
