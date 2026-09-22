"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateCharity(_prev, formData) {
  const charityId = String(formData.get("charity_id") ?? "");
  const percent = Number(formData.get("charity_percent") ?? 10);

  if (!charityId) return { error: "Pick a cause." };
  if (!Number.isInteger(percent) || percent < 10 || percent > 40)
    return { error: "Your share has to be between 10% and 40%." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_charity_choice", {
    p_charity_id: charityId,
    p_charity_percent: percent,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: "Saved. It applies from your next payment." };
}

export async function cancelSubscription(_prev) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_subscription");
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {
    ok: "Cancelled. You keep access until the end of the period you've paid for.",
  };
}

export async function resumeSubscription(_prev) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resume_subscription");
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: "Welcome back. Your subscription will renew as normal." };
}

/**
 * A one-off gift, separate from the subscription.
 *
 * Per the brief this sits outside the game entirely: all of it reaches the
 * charity, none of it enters the prize pool, and it buys no draw entry. The
 * donate() SQL function enforces that split.
 */
export async function makeDonation(_prev, formData) {
  const charityId = String(formData.get("charity_id") ?? "");
  const pounds = Number(formData.get("amount") ?? 0);

  if (!charityId) return { error: "Pick a cause to give to." };
  if (!Number.isFinite(pounds) || pounds < 1)
    return { error: "The smallest donation is £1." };
  if (pounds > 10000) return { error: "For gifts over £10,000, please get in touch." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("donate", {
    p_charity_id: charityId,
    p_amount_pence: Math.round(pounds * 100),
    p_provider_ref: `sim_gift_${crypto.randomUUID().slice(0, 12)}`,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  revalidatePath("/charities");
  return { ok: `Thank you. £${pounds.toFixed(2)} is on its way, every penny of it.` };
}
