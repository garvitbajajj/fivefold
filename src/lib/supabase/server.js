import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Reads the session from cookies, so every query runs as the signed-in user
 * and row level security applies. Create one per request; never hoist it into
 * a module-level singleton or requests would share a session.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. The middleware refreshes
            // the session on every request, so this is safe to swallow.
          }
        },
      },
    },
  );
}
