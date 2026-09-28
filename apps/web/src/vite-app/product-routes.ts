import { startupOsRoute } from "./routes/startup-os";

/**
 * Routes for Nebutra's own products. `pnpm template:build` puts
 * `product-routes.for-template.ts` in place of this file, so a fresh project's
 * router has none of them. Add your product's routes there.
 */
export const productRoutes = [startupOsRoute] as const;
