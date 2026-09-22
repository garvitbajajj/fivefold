import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { Reveal } from "@/components/reveal";
import { createClient } from "@/lib/supabase/server";
import { money, monthName, shortDate } from "@/lib/format";

export const metadata = {
  title: "Results",
  description: "Every published fivefold draw, the numbers, and what each tier paid.",
};

const TIER_SHARE = { 5: 40, 4: 35, 3: 25 };

/**
 * Published draws only.
 *
 * The RLS policy on draws restricts anonymous reads to status = 'published',
 * so an unpublished simulation cannot leak here even if this query forgot to
 * filter — which it does anyway, for clarity.
 */
export default async function ResultsPage() {
  const supabase = await createClient();

  const { data: draws } = await supabase
    .from("draws")
    .select("*, winners(id, tier, prize_pence)")
    .eq("status", "published")
    .order("period", { ascending: false });

  const published = draws ?? [];

  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <Reveal>
          <p className="eyebrow">Results</p>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            Every draw we&apos;ve ever run.
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-paper-300">
            Five numbers from 1 to 45, once a month. The pool splits 40/35/25 across five,
            four and three matches — and if nobody takes the jackpot, it grows.
          </p>
        </Reveal>

        {published.length === 0 ? (
          <Reveal delay={100}>
            <div className="card mt-12 p-14 text-center">
              <div className="flex justify-center gap-2.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="ball"
                    style={{
                      animation: "var(--animate-shimmer)",
                      animationDelay: `${i * 180}ms`,
                    }}
                  >
                    ?
                  </span>
                ))}
              </div>
              <p className="mt-8 font-display text-2xl">The first draw is coming.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
                Get five scores logged before the start of next month and you&apos;ll be
                in it.
              </p>
              <Link href="/subscribe" className="btn-primary mt-7">
                Join fivefold
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="mt-12 space-y-6">
            {published.map((draw, index) => {
              const winners = draw.winners ?? [];
              // What the draw awarded, not what has cleared. Whether an
              // individual prize has been paid is between that winner and us,
              // so it never appears on the public board.
              const awarded = winners.reduce((s, w) => s + w.prize_pence, 0);

              return (
                <Reveal key={draw.id} delay={Math.min(index * 90, 300)}>
                  <article className="card overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-5 px-6 py-6">
                      <div>
                        <h2 className="font-display text-3xl">
                          {monthName(draw.period)}
                        </h2>
                        <p className="mt-1 text-sm text-ink-500">
                          Drawn {draw.published_at ? shortDate(draw.published_at) : "—"} ·{" "}
                          {draw.entrant_count} ticket{draw.entrant_count === 1 ? "" : "s"}
                          {draw.mode === "weighted" && " · score-weighted"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {(draw.numbers ?? []).map((n, i) => (
                          <span
                            key={i}
                            className="ball ball-hit"
                            style={{
                              animation: "var(--animate-ball)",
                              animationDelay: `${i * 110}ms`,
                            }}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Tier-by-tier breakdown, so the split is auditable by
                        anyone who cares to check the arithmetic. */}
                    <dl className="grid gap-px border-t border-ink-800 bg-ink-800 sm:grid-cols-3">
                      {[5, 4, 3].map((tier) => {
                        const tierWinners = winners.filter((w) => w.tier === tier);
                        const pot = Math.floor(
                          (draw.pool_pence * TIER_SHARE[tier]) / 100,
                        );

                        return (
                          <div key={tier} className="bg-ink-900 px-6 py-5">
                            <dt className="flex items-baseline justify-between">
                              <span
                                className={`font-display text-lg ${tier === 5 ? "text-gold-400" : ""}`}
                              >
                                Match {tier}
                              </span>
                              <span className="font-mono text-xs text-ink-500">
                                {TIER_SHARE[tier]}%
                              </span>
                            </dt>
                            <dd className="mt-2">
                              {tierWinners.length > 0 ? (
                                <>
                                  <p className="font-display text-2xl tnum">
                                    {money(tierWinners[0].prize_pence)}
                                  </p>
                                  <p className="mt-0.5 text-xs text-ink-500">
                                    each · {tierWinners.length} winner
                                    {tierWinners.length === 1 ? "" : "s"}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="font-display text-2xl tnum text-ink-600">
                                    {money(pot)}
                                  </p>
                                  <p className="mt-0.5 text-xs text-ink-500">
                                    {tier === 5 ? "rolled over" : "unclaimed"}
                                  </p>
                                </>
                              )}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 px-6 py-4 text-sm">
                      <span className="text-ink-500">
                        Pool {money(draw.pool_pence)}
                        {draw.carry_in_pence > 0 &&
                          ` · ${money(draw.carry_in_pence)} carried in`}
                      </span>
                      <span className={awarded > 0 ? "text-moss-300" : "text-gold-400"}>
                        {awarded > 0
                          ? `${money(awarded)} won by ${winners.length} member${winners.length === 1 ? "" : "s"}`
                          : `${money(draw.carry_out_pence)} rolling into next month`}
                      </span>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
