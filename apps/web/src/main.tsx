import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import { BrowserAuthProvider } from "@/vite-app/auth-provider";
import { queryClient } from "@/vite-app/query-client";
import { router } from "@/vite-app/router";

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
