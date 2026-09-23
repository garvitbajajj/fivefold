import Stripe from "stripe";
import { requireEnv } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe is the source of truth for money. Nothing in this app activates,
 * extends or ends a subscription on its own say-so: it asks Stripe to take a
 * payment, and records the result only once Stripe confirms it.
 *
 * Confirmation reaches us two ways, and both land in the functions below:
 *
 *   - the webhook, signed by Stripe, for every paid invoice, subscription
 *     change and completed donation — including renewals nobody is watching
 *   - the success page, which fetches the Checkout Session from Stripe
 *     directly, so a member is never left looking at "pending" because a
 *     webhook is a few seconds behind
 *
 * Every write is keyed on a Stripe id, so whichever path arrives second is a
 * no-op. Stripe's own retries are harmless for the same reason.
 */

let client;
export function stripe() {
  return (client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY")[0]));
}

const iso = (seconds) => new Date(seconds * 1000).toISOString();
const idOf = (ref) => (typeof ref === "string" ? ref : ref?.id);

// Newer API versions moved the invoice→subscription link under `parent`.
function subscriptionIdOf(invoice) {
  return idOf(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);
}

/**
 * A paid subscription invoice: the first payment, or a renewal.
 * Activates or extends the subscription and writes the split payment.
 */
export async function recordPaidInvoice(invoice) {
  if (invoice.status !== "paid") return false;

  const subscriptionId = subscriptionIdOf(invoice);
  if (!subscriptionId) return false; // not ours — a one-off invoice, say

  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const meta = subscription.metadata ?? {};
  if (!meta.user_id || !meta.plan) {
    throw new Error(`subscription ${subscriptionId} has no fivefold metadata`);
  }

  // The first invoice carries the cause the member picked at checkout.
  // Renewals split with whatever their profile says by then, which is what
  // "changes apply from your next payment" promises.
  const first = invoice.billing_reason === "subscription_create";
  const period = invoice.lines.data[0].period;

  const { error } = await createAdminClient().rpc("record_subscription_invoice", {
    p_user_id: meta.user_id,
    p_plan: meta.plan,
    p_stripe_subscription_id: subscription.id,
    p_stripe_customer_id: idOf(subscription.customer),
    p_invoice_id: invoice.id,
    p_amount_pence: invoice.amount_paid,
    p_period_start: iso(period.start),
    p_period_end: iso(period.end),
    p_charity_id: first ? meta.charity_id : null,
    p_charity_percent: first ? Number(meta.charity_percent) : null,
  });

  if (error) throw new Error(`recording invoice ${invoice.id}: ${error.message}`);
  return true;
}

/**
 * A subscription changed on Stripe's side: cancellation scheduled or undone,
 * a renewal failed, or it ended. Brings our row into line.
 */
export async function syncSubscription(subscription) {
  const item = subscription.items?.data?.[0];

  const status =
    subscription.status === "active" || subscription.status === "trialing"
      ? "active"
      : subscription.status === "canceled"
        ? "cancelled"
        : subscription.status === "incomplete"
          ? null // first payment not taken yet; there is no row to update
          : "lapsed"; // past_due, unpaid, incomplete_expired, paused

  if (!status) return false;

  const update = {
    status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  };
  // An ended subscription loses access now, not at the end of a period it
  // no longer has.
  if (status === "cancelled" && subscription.ended_at) {
    update.current_period_end = iso(subscription.ended_at);
  } else if (item?.current_period_end) {
    update.current_period_end = iso(item.current_period_end);
  }

  const { error } = await createAdminClient()
    .from("subscriptions")
    .update(update)
    .eq("stripe_subscription_id", subscription.id);

  if (error) throw new Error(`syncing ${subscription.id}: ${error.message}`);
  return true;
}

/** A completed one-off donation. All of it to the charity. */
export async function recordPaidDonation(session) {
  if (session.mode !== "payment" || session.payment_status !== "paid") return false;
  if (session.metadata?.kind !== "donation") return false;

  const { error } = await createAdminClient().rpc("record_donation", {
    p_user_id: session.metadata.user_id,
    p_charity_id: session.metadata.charity_id,
    p_amount_pence: session.amount_total,
    p_session_id: session.id,
  });

  if (error) throw new Error(`recording donation ${session.id}: ${error.message}`);
  return true;
}

/**
 * The URL this request arrived at, for Stripe's return links. Taken from the
 * request rather than configured, so previews and local dev send the member
 * back to where they started.
 */
export function originFrom(headers) {
  const origin = headers.get("origin");
  if (origin) return origin;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
