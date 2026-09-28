import { createRouter } from "@tanstack/react-router";
import { productRoutes } from "./product-routes";
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
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
