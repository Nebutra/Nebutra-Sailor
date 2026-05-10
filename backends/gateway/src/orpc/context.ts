import type { TenantContext } from "../middlewares/tenantContext.js";

export interface OrpcContext {
  tenant: TenantContext;
}
