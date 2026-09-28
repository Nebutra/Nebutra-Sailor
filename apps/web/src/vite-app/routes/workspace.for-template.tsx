import { createRoute, Navigate } from "@tanstack/react-router";
import { rootRoute } from "./__root";

// Where sign-in returns to. A fresh project's product home is its welcome page.
export const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspace",
  component: () => <Navigate to="/welcome" replace />,
});
