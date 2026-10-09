import { createRouter } from "@tanstack/react-router";
import { productRoutes } from "./product-routes";
import { queryClient } from "./query-client";
import {
  ROUTE_PENDING_MIN_MS,
  ROUTE_PENDING_MS,
  RouteError,
  RouteNotFound,
  RoutePending,
} from "./route-states";
import { rootRoute } from "./routes/__root";
import { billingRoute } from "./routes/billing";
import { indexRoute } from "./routes/index";
import { settingsRoute } from "./routes/settings";
import { signInRoute } from "./routes/sign-in";
import { welcomeRoute } from "./routes/welcome";
import { workspaceRoute } from "./routes/workspace";

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  ...productRoutes,
  workspaceRoute,
  settingsRoute,
  billingRoute,
  welcomeRoute,
]);

export const router = createRouter({
  routeTree,
  // Loaders read through the query cache (`queryClient.ensureQueryData`), so
  // a preload, the loader and the component share one request.
  context: { queryClient },
  defaultPreload: "intent",
  // The query cache owns freshness; the router should not cache on top of it.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: RoutePending,
  defaultPendingMs: ROUTE_PENDING_MS,
  defaultPendingMinMs: ROUTE_PENDING_MIN_MS,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
