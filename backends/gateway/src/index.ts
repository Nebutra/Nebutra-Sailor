// Standalone-server entry point. Builds the gateway app with background
// workers registered (startWorkers defaults to true) — this is the behavior
// the Fly/Cloudflare standalone deploy and worker.ts (Cloudflare Worker)
// depend on.
//
// The Next.js mount (apps/web/src/app/api/[[...route]]/route.ts,
// GATEWAY_MODE=embedded) calls createGatewayApp({ startWorkers: false })
// directly from ./app.js instead of importing this file, so it never starts
// the in-process queue workers. See src/app.ts for the factory and the
// reasoning.
import { createGatewayApp } from "./app.js";

const { app, areGatewayDepsInitialized } = await createGatewayApp({ startWorkers: true });

export { areGatewayDepsInitialized };
export default app;
