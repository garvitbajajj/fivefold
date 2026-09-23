import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { createClient } from "@/lib/supabase/server";
import { stripe, recordPaidInvoice } from "@/lib/stripe";

export const metadata = { title: "Payment" };

/**
 * Where Stripe sends the member after checkout.
 *
 * Arriving here proves nothing — anyone can type this URL. So the page asks
 * Stripe for the session and only treats the subscription as live if Stripe
 * says the first invoice is paid. It then records it, so the member sees an
 * active dashboard immediately rather than waiting on the webhook. If the
 * webhook got there first, recording is a no-op.
 */
export default async function SubscribeSuccessPage({ searchParams }) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect("/subscribe");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/subscribe/success?session_id=${sessionId}`);

  let outcome = "error";
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["invoice"],
    });

    if (session.client_reference_id !== user.id) {
      outcome = "not-yours";
    } else if (session.status === "complete" && session.payment_status === "paid") {
      await recordPaidInvoice(session.invoice);
      outcome = "paid";
    } else {
      outcome = "pending";
    }
  } catch (error) {
    console.error("verifying checkout session:", error);
  }

  const copy = {
    paid: {
      eyebrow: "Payment confirmed",
      title: "You're in.",
      body: "Stripe has confirmed your payment and your subscription is live. Log five rounds and you'll be in the next draw.",
      cta: { href: "/dashboard?welcome=1", label: "Go to your dashboard" },
    },
    pending: {
      eyebrow: "Payment processing",
      title: "Nearly there.",
      body: "Stripe hasn't confirmed the payment yet — some cards take a moment. Your subscription activates the instant it does; there's nothing more to do.",
      cta: { href: "/dashboard", label: "Go to your dashboard" },
    },
    "not-yours": {
      eyebrow: "Wrong account",
      title: "That checkout belongs to someone else.",
      body: "Sign in with the account you started the checkout from.",
      cta: { href: "/dashboard", label: "Go to your dashboard" },
    },
    error: {
      eyebrow: "Couldn't confirm",
      title: "We couldn't check on that payment.",
      body: "If you completed checkout, your subscription will activate as soon as Stripe notifies us — usually within a minute. You won't be charged twice.",
      cta: { href: "/dashboard", label: "Go to your dashboard" },
    },
  }[outcome];

  return (
    <>
      <SiteNav />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-20 text-center sm:px-6">
        <p className={`eyebrow ${outcome === "paid" ? "" : "!text-ink-500"}`}>
          {copy.eyebrow}
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-5 max-w-md leading-relaxed text-paper-300">
          {copy.body}
        </p>

        {outcome === "paid" && (
          <div className="mt-8 flex justify-center gap-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="ball border-dashed text-ink-600"
                style={{
                  animation: "var(--animate-ball)",
                  animationDelay: `${i * 90}ms`,
                }}
              >
                —
              </span>
            ))}
          </div>
        )}

        <div className="mt-10">
          <Link href={copy.cta.href} className="btn-primary">
            {copy.cta.label}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
