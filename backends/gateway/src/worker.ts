import app from "./index.js";

type GatewayFetch = typeof app.fetch;
type GatewayEnv = NonNullable<Parameters<GatewayFetch>[1]>;
type GatewayExecutionContext = Parameters<GatewayFetch>[2];

export default {
  fetch(request: Request, env: GatewayEnv, executionContext?: GatewayExecutionContext) {
    return app.fetch(request, env, executionContext);
  },
};
