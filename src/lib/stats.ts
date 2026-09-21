import { createClient } from "@/lib/supabase/server";

export type PlatformStats = {
  total_users: number;
  active_subscribers: number;
  charity_total_pence: number;
  donation_total_pence: number;
  pool_total_pence: number;
  paid_out_pence: number;
  current_pool_pence: number;
  draws_published: number;
  winners_total: number;
  charities_count: number;
};

const EMPTY: PlatformStats = {
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
export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_stats");
  if (error || !data) return EMPTY;
  return { ...EMPTY, ...(data as PlatformStats) };
}

export type CharityTotals = Record<string, { raised: number; supporters: number }>;

export async function getCharityTotals(): Promise<CharityTotals> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("charity_totals");
  const rows = (data ?? []) as {
    charity_id: string;
    raised_pence: number;
    supporters: number;
  }[];

  return Object.fromEntries(
    rows.map((r) => [r.charity_id, { raised: r.raised_pence, supporters: r.supporters }]),
  );
}
