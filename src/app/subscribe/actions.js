"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe, originFrom } from "@/lib/stripe";

/**
 * Sends the member to Stripe to pay.
 *
 * Deliberately writes nothing. The subscription does not exist until Stripe
 * confirms the first invoice is paid — see recordPaidInvoice in lib/stripe.
 * Abandon the checkout and the database is exactly as it was.
 *
 * The member's choices ride along as subscription metadata, so they reach the
 * webhook intact without being stored anywhere a half-finished checkout could
 * leave them behind.
 */
export async function startCheckout(_prev, formData) {
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

  // Checked now rather than after payment: taking someone's money and then
  // failing to record it because the cause was retired would be far worse.
  const [{ data: charity }, { data: price }, { data: profile }] = await Promise.all([
    supabase
      .from("charities")
      .select("id")
      .eq("id", charityId)
      .eq("is_active", true)
      .maybeSingle(),
    // The price comes from the same SQL function the rest of the platform
    // uses, never from the form.
    supabase.rpc("plan_price", { p_plan: plan }),
    supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single(),
  ]);

  if (!charity) return { error: "That cause is no longer taking new supporters." };
  if (!price) return { error: "Couldn't price that plan. Try again." };

  const origin = originFrom(await headers());

  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: price,
            recurring: { interval: plan === "yearly" ? "year" : "month" },
            product_data: { name: `fivefold ${plan} membership` },
          },
        },
      ],
      // Returning members keep their Stripe customer and saved card.
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
          charity_id: charityId,
          charity_percent: String(charityPercent),
        },
      },
      success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?cancelled=1`,
    });
  } catch (error) {
    console.error("stripe checkout:", error);
    return {
      error: "We couldn't reach the payment provider. Nothing was charged — try again.",
    };
  }

  // Outside the try: redirect() works by throwing, and must not be caught.
  redirect(session.url);
}
