import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return false;
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return true;
  }
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.CARAMBA_DB_SECRET);
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("Supabase service credentials are not configured.");
  }
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.CARAMBA_DB_SECRET;
  if (!anonKey || !secret) {
    throw new Error("Supabase service credentials are not configured.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-caramba-secret": secret } },
  });
}
