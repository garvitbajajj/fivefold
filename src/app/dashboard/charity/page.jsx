import Link from "next/link";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { money, shortDate } from "@/lib/format";
import { CharitySettings, SubscriptionControls, DonationBox } from "./charity-settings";

export const metadata = { title: "My cause" };

export default async function CharityPage() {
  const session = await requireSession("/dashboard/charity");
  const supabase = await createClient();

  const [{ data: charities }, { data: payments }] = await Promise.all([
    supabase.from("charities").select("*").eq("is_active", true).order("name"),
    supabase
      .from("payments")
      .select("*, charities(name)")
      .eq("user_id", session.userId)
      .order("paid_at", { ascending: false }),
  ]);

  const history = payments ?? [];
  const given = history.reduce((s, p) => s + p.charity_pence, 0);

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl">Your giving</h1>
        <p className="mt-1.5 text-paper-300">
          {given > 0
            ? `You've sent ${money(given)} to good causes so far.`
            : "Choose where your share goes."}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-5">
          <CharitySettings
            charities={charities ?? []}
            current={session.profile.charity_id}
            percent={session.profile.charity_percent}
            subscription={session.subscription}
          />

          {/* ------------------------------------------------- payment history */}
          <section className="card overflow-hidden">
            <div className="border-b border-ink-700 px-6 py-5">
              <h2 className="font-display text-2xl">Where your money went</h2>
              <p className="mt-1 text-sm text-ink-500">
                Every payment, split exactly as it was taken.
              </p>
            </div>

            {history.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-500">
                No payments yet.
              </p>
            ) : (
              <ul className="divide-y divide-ink-800">
                {history.map((payment) => (
                  <li key={payment.id} className="px-6 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <span className="text-sm">
                          {payment.kind === "donation" ? "One-off gift" : "Subscription"}
                        </span>
                        <span className="ml-2 text-xs text-ink-500">
                          {shortDate(payment.paid_at)}
                        </span>
                      </div>
                      <span className="tnum text-sm">{money(payment.amount_pence)}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                      <span className="text-moss-300">
                        {money(payment.charity_pence)} to{" "}
                        {payment.charities?.name ?? "charity"}
                      </span>
                      {payment.prize_pool_pence > 0 && (
                        <span className="text-gold-400">
                          {money(payment.prize_pool_pence)} to the pool
                        </span>
                      )}
                      {payment.platform_pence > 0 && (
                        <span className="text-ink-500">
                          {money(payment.platform_pence)} platform
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {session.subscription && session.isSubscribed ? (
            <SubscriptionControls subscription={session.subscription} />
          ) : (
            <div className="card p-6">
              <h2 className="font-display text-2xl">Subscription</h2>
              <p className="mt-2 text-sm leading-relaxed text-paper-300">
                You don&apos;t have an active subscription, so nothing is reaching a
                charity and you&apos;re not in the draw.
              </p>
              <Link href="/subscribe" className="btn-primary mt-5 !py-2.5 text-sm">
                Start again
              </Link>
            </div>
          )}

          <DonationBox
            charities={charities ?? []}
            defaultCharityId={session.profile.charity_id ?? undefined}
          />
        </div>
      </div>
    </>
  );
}
