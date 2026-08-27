import { getSupabaseServer, getSupabaseTenant } from "./client";

/**
 * Set tenant context for RLS in raw SQL
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  const client = getSupabaseServer();
  await client.rpc("set_tenant_context", { tenant_id: tenantId });
}

/**
 * Execute a function within tenant context
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: ReturnType<typeof getSupabaseTenant>) => Promise<T>,
): Promise<T> {
  const client = getSupabaseTenant(tenantId);
  return fn(client);
}

/**
 * Call a Supabase Edge Function
 */
export async function invokeFunction<T = unknown>(
  functionName: string,
  options?: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
): Promise<T> {
  const client = getSupabaseServer();

  const { data, error } = await client.functions.invoke<T>(functionName, {
    body: options?.body,
    headers: options?.headers,
  });

  if (error) {
    throw new Error(`Function invocation failed: ${error.message}`);
  }

  return data as T;
}

/**
 * Execute raw SQL (admin only, use with caution)
 */
export async function executeSQL<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = getSupabaseServer();

  const { data, error } = await client.rpc("execute_sql", {
    query: sql,
    params: params || [],
  });

  if (error) {
    throw new Error(`SQL execution failed: ${error.message}`);
  }

  return data as T[];
}

/**
 * Health check for Supabase connection
 */
export async function healthCheck(): Promise<{
  status: "healthy" | "unhealthy";
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const client = getSupabaseServer();
    // Simple query to test connection
    await client.from("organizations").select("id").limit(1);

    return {
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
