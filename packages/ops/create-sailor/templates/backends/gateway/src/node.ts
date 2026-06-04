import { serve } from "@hono/node-server";
import app from "./index.js";

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port });
