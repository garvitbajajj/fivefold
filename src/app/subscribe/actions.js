"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
/**
 * Completes a subscription.
 *
 * The card details collected on the checkout screen are never sent here and
 * never stored — this build simulates the gateway. Swapping in Stripe means
 * creating a PaymentIntent, and passing its id as p_provider_ref. The money
 * split, the prices and the period dates all stay where they are, in SQL.
 */
export async function subscribeAction(_prev, formData) {
  const plan = String(formData.get("plan") ?? "");
  const charityId = String(formData.get("charity_id") ?? "");
  const charityPercent = Number(formData.get("charity_percent") ?? 10);
  if (plan !== "monthly" && plan !== "yearly") return { error: "Choose a plan." };
  if (!charityId) return { error: "Choose a cause to support." };
  if (!Number.isInteger(charityPercent) || charityPercent < 10 || charityPercent > 40)
    return { error: "Charity share must be between 10% and 40%." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/subscribe");
  const { error } = await supabase.rpc("subscribe", {
    p_plan: plan,
    p_charity_id: charityId,
    p_charity_percent: charityPercent,
    // Stand-in for a gateway reference so the ledger column is exercised.
    p_provider_ref: `sim_${crypto.randomUUID().slice(0, 18)}`,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=1");
}
