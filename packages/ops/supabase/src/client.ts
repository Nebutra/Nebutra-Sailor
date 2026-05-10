import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type { SupabaseClient };

let clientInstance: SupabaseClient | null = null;
let serverInstance: SupabaseClient | null = null;

/**
 * Get Supabase client for browser/client-side usage
 * Uses anon key - respects RLS policies
 */
export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase URL and anon key are required");
  }

  clientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return clientInstance;
}

/**
 * Get Supabase client for server-side usage
 * Uses service role key - bypasses RLS
 */
export function getSupabaseServer(): SupabaseClient {
  if (serverInstance) return serverInstance;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase URL and service role key are required");
  }

  serverInstance = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverInstance;
}

/**
 * Create a tenant-scoped client
 * Sets the tenant context for RLS policies
 */
export function getSupabaseTenant(tenantId: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase URL and service role key are required");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-tenant-id": tenantId,
      },
    },
    db: {
      schema: "public",
    },
  });
}
