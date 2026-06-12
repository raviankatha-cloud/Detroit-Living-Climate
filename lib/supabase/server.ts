import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url && !key) {
    console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both missing.");
    return null;
  }

  if (!url) {
    console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL is missing.");
    return null;
  }

  if (!key) {
    console.warn("[supabase] SUPABASE_SERVICE_ROLE_KEY is missing.");
    return null;
  }

  serviceClient ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return serviceClient;
}
