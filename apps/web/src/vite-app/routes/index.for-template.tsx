import { createRoute, Navigate } from "@tanstack/react-router";
import { rootRoute } from "./__root";

// A fresh project opens on its welcome page; point this at your own home page.
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/welcome" replace />,
});
