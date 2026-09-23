import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { SubscribeForm } from "./subscribe-form";
import { createClient } from "@/lib/supabase/server";
export const metadata = { title: "Join" };
export default async function SubscribePage({ searchParams }) {
  const { cancelled } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Signing up first keeps the payment step honest: there is an account to
  // attach the subscription to before any money is discussed.
  if (!user) redirect("/signup");
  const [{ data: charities }, { data: profile }, { data: active }] = await Promise.all([
    supabase.from("charities").select("*").eq("is_active", true).order("name"),
    supabase
      .from("profiles")
      .select("charity_id, charity_percent")
      .eq("id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle(),
  ]);
  // Already paid up — no reason to show a checkout.
  if (active) redirect("/dashboard");
  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="eyebrow">Join fivefold</p>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            Three decisions, then you&apos;re in.
          </h1>
          <p className="mt-4 leading-relaxed text-paper-300">
            Every one of them is reversible except the good you do, which is rather the
            point.
          </p>
        </div>

        {/* Back from Stripe without paying. Nothing was written, so there is
            nothing to undo — just say so. */}
        {cancelled && (
          <p className="card mt-8 max-w-2xl border-gold-600/40 bg-gold-400/5 p-4 text-sm text-gold-300">
            Checkout cancelled — you weren&apos;t charged and nothing has changed. Your
            choices are below if you&apos;d like to try again.
          </p>
        )}

        <div className="mt-12">
          {charities && charities.length > 0 ? (
            <SubscribeForm
              charities={charities}
              defaultCharityId={profile?.charity_id ?? undefined}
              defaultPercent={profile?.charity_percent ?? undefined}
            />
          ) : (
            <div className="card p-8 text-center">
              <p className="text-paper-300">
                No causes are listed yet, so there&apos;s nothing to subscribe to.
              </p>
              <Link href="/" className="btn-ghost mt-5">
                Back to the homepage
              </Link>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
