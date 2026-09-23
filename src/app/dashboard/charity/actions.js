"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, syncSubscription, originFrom } from "@/lib/stripe";

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

/**
 * Schedules or undoes a cancellation.
 *
 * Stripe is told first, because Stripe is what would otherwise keep charging.
 * Our row is then updated from Stripe's reply rather than from what we asked
 * for, so the two can't disagree. The webhook will deliver the same change a
 * moment later; applying it twice is harmless.
 */
async function setCancelAtPeriodEnd(cancel) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, stripe_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub) return { error: "You don't have an active subscription." };

  try {
    if (sub.stripe_subscription_id) {
      const updated = await stripe().subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: cancel,
      });
      await syncSubscription(updated);
    } else {
      // Seeded demo members were never billed through Stripe, so there is
      // nothing to tell it. Members have no direct write on subscriptions,
      // so this goes through the server client, scoped to their own row.
      await createAdminClient()
        .from("subscriptions")
        .update({ cancel_at_period_end: cancel })
        .eq("id", sub.id)
        .eq("user_id", user.id);
    }
  } catch (error) {
    console.error("changing cancellation:", error);
    return {
      error: "We couldn't reach the payment provider. Nothing changed — try again.",
    };
  }

  revalidatePath("/dashboard", "layout");
  return null;
}

export async function cancelSubscription(_prev) {
  const failed = await setCancelAtPeriodEnd(true);
  return (
    failed ?? {
      ok: "Cancelled. You won't be charged again, and you keep access until the end of the period you've paid for.",
    }
  );
}

export async function resumeSubscription(_prev) {
  const failed = await setCancelAtPeriodEnd(false);
  return failed ?? { ok: "Welcome back. Your subscription will renew as normal." };
}

/**
 * A one-off gift, separate from the subscription.
 *
 * Paid through Stripe Checkout like everything else, and recorded only once
 * Stripe confirms it. Per the brief it sits outside the game: all of it
 * reaches the charity, none enters the prize pool, and it buys no entry.
 */
export async function makeDonation(_prev, formData) {
  const charityId = String(formData.get("charity_id") ?? "");
  const pounds = Number(formData.get("amount") ?? 0);

  if (!charityId) return { error: "Pick a cause to give to." };
  if (!Number.isFinite(pounds) || pounds < 1)
    return { error: "The smallest donation is £1." };
  if (pounds > 10000) return { error: "For gifts over £10,000, please get in touch." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data: charity } = await supabase
    .from("charities")
    .select("id, name")
    .eq("id", charityId)
    .eq("is_active", true)
    .maybeSingle();
  if (!charity) return { error: "That cause is no longer taking donations." };

  const origin = originFrom(await headers());

  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(pounds * 100),
            product_data: { name: `Donation to ${charity.name}` },
          },
        },
      ],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { kind: "donation", user_id: user.id, charity_id: charity.id },
      success_url: `${origin}/dashboard/charity?donation={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/charity`,
    });
  } catch (error) {
    console.error("stripe donation checkout:", error);
    return {
      error: "We couldn't reach the payment provider. Nothing was charged — try again.",
    };
  }

  redirect(session.url);
}
