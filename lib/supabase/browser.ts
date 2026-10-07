import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey);
}

export async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserSupabase();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
