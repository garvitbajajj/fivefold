import { createClient } from "@/lib/supabase/server";
const EMPTY = {
  total_users: 0,
  active_subscribers: 0,
  charity_total_pence: 0,
  donation_total_pence: 0,
  pool_total_pence: 0,
  paid_out_pence: 0,
  current_pool_pence: 0,
  draws_published: 0,
  winners_total: 0,
  charities_count: 0,
};
/**
 * Platform-wide totals, safe for anonymous visitors.
 *
 * Falls back to zeroes rather than throwing: an empty homepage is a much
 * better failure than a 500, and nothing here is load-bearing.
 */
export async function getPlatformStats() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_stats");
  if (error || !data) return EMPTY;
  return { ...EMPTY, ...data };
}
export async function getCharityTotals() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("charity_totals");
  const rows = data ?? [];
  return Object.fromEntries(
    rows.map((r) => [r.charity_id, { raised: r.raised_pence, supporters: r.supporters }]),
  );
}
