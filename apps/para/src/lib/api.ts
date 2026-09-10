import { api as mockApi } from "@/mock/api";
import { gatewayApi, isGatewayMode } from "./gateway-api";

/**
 * One `api` shape, two implementations. The gateway adapter is selected by NEXT_PUBLIC_PARA_API_URL;
 * without it the shell runs standalone on mock data.
 */
export type ParaApi = typeof mockApi;
export const api: ParaApi = isGatewayMode ? gatewayApi : mockApi;
export { isGatewayMode };
