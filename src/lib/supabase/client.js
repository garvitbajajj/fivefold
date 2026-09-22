import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
/**
 * Supabase client for Client Components.
 *
 * Used only where the browser genuinely needs it — signing in, signing out,
 * and uploading a winner's proof straight to storage. Everything else goes
 * through Server Actions.
 */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
