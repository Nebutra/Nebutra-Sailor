import type { TenantContext } from "../middlewares/tenantContext.js";

export interface TrpcContext {
  tenant: TenantContext;
}
