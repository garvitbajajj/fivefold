import { createClient } from "@supabase/supabase-js";
import { requireEnv, supabaseEnv } from "./env";

/**
 * Service-role client. Bypasses row level security.
 *
 * Used for exactly one job: writing a payment Stripe has confirmed. That write
 * has no signed-in user behind it when it comes from a webhook, and the
 * functions that do it — record_subscription_invoice and record_donation —
 * are granted to the service role alone, so nothing a member controls can
 * reach them.
 *
 * Server only. The key is not NEXT_PUBLIC_, so Next never ships it to the
 * browser; importing this from a Client Component would fail to find it.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const [key] = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
