import { createRoute, Navigate } from "@tanstack/react-router";
import { rootRoute } from "./__root";

export const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspace",
  component: () => <Navigate to="/startup-os" replace />,
});
