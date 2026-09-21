import { createBrowserClient } from "@supabase/ssr";
/**
 * Supabase client for Client Components.
 *
 * Used only where the browser genuinely needs it — signing in, signing out,
 * and uploading a winner's proof straight to storage. Everything else goes
 * through Server Actions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
