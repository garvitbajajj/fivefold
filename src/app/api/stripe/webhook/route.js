import {
  stripe,
  recordPaidInvoice,
  syncSubscription,
  recordPaidDonation,
} from "@/lib/stripe";
import { requireEnv } from "@/lib/supabase/env";

/**
 * Stripe webhook.
 *
 * The signature check is the whole of the security here: anyone can POST to
 * this URL, but only Stripe holds the secret that makes constructEvent accept
 * the body. The raw text is verified before a single field of it is trusted.
 *
 * Configure the endpoint in Stripe with these events:
 *   invoice.paid
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   checkout.session.completed
 */
export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    const [secret] = requireEnv("STRIPE_WEBHOOK_SECRET");
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    return new Response(`Webhook rejected: ${error.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.paid":
        await recordPaidInvoice(event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      case "checkout.session.completed":
        // Subscriptions are recorded from invoice.paid, which also covers
        // renewals; this only needs to handle one-off donations.
        await recordPaidDonation(event.data.object);
        break;
    }
  } catch (error) {
    // A 500 makes Stripe retry with backoff, which is what we want for a
    // transient failure. Every handler is idempotent, so a retry of
    // something that half-succeeded is safe.
    console.error(`stripe webhook ${event.type} ${event.id}:`, error);
    return new Response("Handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}
