import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { Reveal } from "@/components/reveal";
import { createClient } from "@/lib/supabase/server";
import { getPlatformStats } from "@/lib/stats";
import { money, monthName } from "@/lib/format";
export default async function HomePage() {
  const supabase = await createClient();
  const [stats, { data: featured }, { data: latestDraw }] = await Promise.all([
    getPlatformStats(),
    supabase
      .from("charities")
      .select("*")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("draws")
      .select("*")
      .eq("status", "published")
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return (
    <>
      <SiteNav />

      {/* ---------------------------------------------------------------- hero
            Leads with the charitable promise, not the sport. The five numbers
            are the only nod to the game, and they double as the product's
            central metaphor. */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <Reveal>
            <p className="eyebrow">A draw with a conscience</p>
            <h1 className="mt-5 max-w-3xl font-display text-[2.75rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Your last five rounds
              <br />
              are already a <span className="italic text-gold-400">ticket</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper-300">
              Log the five scores you played anyway. Once a month we draw five numbers
              between 1 and 45 — and a slice of every subscription goes to a cause you
              choose, whether you win or not.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/subscribe" className="btn-primary">
                Join from £12 a month
              </Link>
              <Link href="/how-it-works" className="btn-ghost">
                See how the draw works
              </Link>
            </div>
          </Reveal>

          {/* Live numbers. Real figures from the database, not decoration. */}
          <Reveal delay={220}>
            <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
              {[
                {
                  label: "To charity so far",
                  value: money(stats.charity_total_pence, { compact: true }),
                },
                {
                  label: "This month's pool",
                  value: money(stats.current_pool_pence, { compact: true }),
                },
                {
                  label: "Playing this month",
                  value: stats.active_subscribers.toLocaleString("en-GB"),
                },
                { label: "Causes to back", value: stats.charities_count.toString() },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="font-display text-3xl tnum text-paper-50 sm:text-4xl">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 text-xs leading-snug text-ink-500">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- what you do */}
      <section className="border-b border-ink-800 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="eyebrow">What you actually do</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-5xl">
              Three things, and only one of them is new.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Pick a cause",
                body: "Choose from our directory when you join. At least 10% of everything you pay goes straight to them. Move it up to 40% whenever you like.",
              },
              {
                n: "02",
                title: "Log five scores",
                body: "Your last five Stableford rounds, each between 1 and 45. Play a sixth and the oldest drops off automatically. That's your ticket.",
              },
              {
                n: "03",
                title: "Watch the draw",
                body: "Five numbers, first of every month. Match three, four or five of yours and you take a share of the pool that month's subscriptions built.",
              },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 110}>
                <div className="card card-hover h-full p-7">
                  <span className="font-mono text-xs text-gold-400">{step.n}</span>
                  <h3 className="mt-4 font-display text-2xl">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-paper-300">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ how you win */}
      <section className="border-b border-ink-800 bg-ink-900 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="eyebrow">How you win</p>
              <h2 className="mt-4 font-display text-3xl leading-tight sm:text-5xl">
                The pool splits three ways.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-paper-300">
                Half of every subscription funds the prize pool. It divides across three
                tiers, and anyone on the same tier shares that tier equally. Nobody
                matches five? The jackpot rolls into next month and grows.
              </p>

              <dl className="mt-9 space-y-px overflow-hidden rounded-xl border border-ink-700">
                {[
                  {
                    match: "Match 5",
                    share: "40%",
                    note: "Jackpot — rolls over",
                    gold: true,
                  },
                  { match: "Match 4", share: "35%", note: "Split equally" },
                  { match: "Match 3", share: "25%", note: "Split equally" },
                ].map((tier) => (
                  <div
                    key={tier.match}
                    className="flex items-center justify-between gap-4 bg-ink-800 px-5 py-4"
                  >
                    <span
                      className={`font-display text-lg ${tier.gold ? "text-gold-400" : "text-paper-100"}`}
                    >
                      {tier.match}
                    </span>
                    <span className="flex-1 text-right text-xs text-ink-500">
                      {tier.note}
                    </span>
                    <span className="w-14 text-right font-mono text-lg tnum text-paper-50">
                      {tier.share}
                    </span>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={140}>
              <div className="card p-8">
                {latestDraw?.numbers ? (
                  <>
                    <p className="eyebrow">{monthName(latestDraw.period)} result</p>
                    <div className="mt-6 flex flex-wrap gap-2.5">
                      {latestDraw.numbers.map((n, i) => (
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
                    <div className="mt-7 grid grid-cols-2 gap-5 border-t border-ink-700 pt-6 text-sm">
                      <div>
                        <p className="text-ink-500">Pool that month</p>
                        <p className="mt-1 font-display text-2xl tnum">
                          {money(latestDraw.pool_pence)}
                        </p>
                      </div>
                      <div>
                        <p className="text-ink-500">Tickets in</p>
                        <p className="mt-1 font-display text-2xl tnum">
                          {latestDraw.entrant_count.toLocaleString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/results"
                      className="mt-6 inline-block text-sm text-gold-400 hover:text-gold-300"
                    >
                      Every result so far →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="eyebrow">First draw pending</p>
                    <div className="mt-6 flex flex-wrap gap-2.5">
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
                    <p className="mt-7 border-t border-ink-700 pt-6 text-sm leading-relaxed text-paper-300">
                      The first five numbers come out at the start of next month. Get your
                      scores in before then and you are in it.
                    </p>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- charity spotlight */}
      {featured && (
        <section className="border-b border-ink-800 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="eyebrow">Charity in the spotlight</p>
            </Reveal>
            <Reveal delay={100}>
              <div className="card mt-6 overflow-hidden md:flex">
                <div className="flex items-center justify-center bg-moss-600/15 p-10 md:w-2/5">
                  <div className="text-center">
                    <p className="font-display text-5xl text-moss-300">
                      {money(stats.charity_total_pence, { compact: true })}
                    </p>
                    <p className="mt-2 text-xs text-ink-500">
                      raised across every cause on fivefold
                    </p>
                  </div>
                </div>
                <div className="p-8 md:w-3/5 md:p-10">
                  <span className="pill text-moss-400">{featured.category}</span>
                  <h2 className="mt-4 font-display text-3xl leading-tight">
                    {featured.name}
                  </h2>
                  <p className="mt-2 text-paper-300">{featured.tagline}</p>
                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-500">
                    {featured.description}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href={`/charities/${featured.slug}`}
                      className="btn-ghost !py-2.5 text-sm"
                    >
                      Read their story
                    </Link>
                    <Link href="/charities" className="btn-ghost !py-2.5 text-sm">
                      All {stats.charities_count} causes
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------- cta */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <h2 className="font-display text-4xl leading-tight sm:text-6xl">
              You were going to play anyway.
            </h2>
            <p className="mx-auto mt-5 max-w-lg leading-relaxed text-paper-300">
              £12 a month, or £120 for the year and two months are on us. Cancel whenever
              — you keep the time you paid for, and you stay in that month&apos;s draw.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/subscribe" className="btn-primary">
                Start now
              </Link>
              <Link href="/charities" className="btn-ghost">
                Browse the causes first
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
