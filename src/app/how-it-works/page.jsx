import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { Reveal } from "@/components/reveal";
import { getPlatformStats } from "@/lib/stats";
import { money } from "@/lib/format";

export const metadata = {
  title: "How it works",
  description:
    "Your last five golf scores are your ticket. Five numbers are drawn monthly from 1 to 45, and a share of every subscription goes to a charity you choose.",
};

export default async function HowItWorksPage() {
  const stats = await getPlatformStats();

  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">
            The scores you already shot
            <span className="italic text-gold-400"> are the ticket</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-paper-300">
            A Stableford round scores somewhere between 1 and 45. So does a lottery ball.
            That coincidence is the whole product: you don&apos;t pick numbers, you play
            golf, and your last five rounds are entered automatically.
          </p>
        </Reveal>

        {/* ------------------------------------------------------- the ticket */}
        <Reveal delay={100}>
          <section className="card mt-12 p-8">
            <p className="eyebrow">Your ticket</p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {[34, 28, 41, 19, 7].map((n, i) => (
                <span
                  key={n}
                  className="ball"
                  style={{
                    animation: "var(--animate-ball)",
                    animationDelay: `${i * 90}ms`,
                  }}
                >
                  {n}
                </span>
              ))}
              <span className="ml-3 text-sm text-ink-500">
                your five most recent rounds
              </span>
            </div>

            <p className="mt-7 text-sm leading-relaxed text-paper-300">
              Log a sixth round and the oldest drops off automatically — the ticket is
              always your latest five. Play twice in a day and only one score counts for
              that date; edit it if you shot better second time round.
            </p>
          </section>
        </Reveal>

        {/* --------------------------------------------------------- the draw */}
        <Reveal delay={150}>
          <section className="mt-10">
            <p className="eyebrow">The draw</p>
            <h2 className="mt-3 font-display text-3xl">
              Five numbers, first of the month.
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="card p-6">
                <h3 className="font-display text-xl">Random</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-300">
                  Every number from 1 to 45 is equally likely. A standard lottery, run
                  monthly.
                </p>
              </div>
              <div className="card p-6">
                <h3 className="font-display text-xl">Score-weighted</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-300">
                  Numbers that come up often across everyone&apos;s scorecards are
                  weighted to appear more — so the draw leans towards what golfers
                  actually shoot.
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-ink-500">
              Which mode runs each month is an operational decision, published alongside
              the result. Every draw is simulated and reviewed before anyone sees it, and
              once published the numbers are frozen.
            </p>
          </section>
        </Reveal>

        {/* -------------------------------------------------------- the money */}
        <Reveal delay={200}>
          <section className="mt-12">
            <p className="eyebrow">Where the money goes</p>
            <h2 className="mt-3 font-display text-3xl">Split before anyone plays.</h2>

            <div className="card mt-6 overflow-hidden">
              <div className="grid gap-px bg-ink-800 sm:grid-cols-3">
                <Slice
                  pct="10–40%"
                  label="Your charity"
                  body="You set this when you join. Ten percent is the floor."
                  tone="moss"
                />
                <Slice
                  pct="50%"
                  label="Prize pool"
                  body="Fixed. Every subscription contributes the same share."
                  tone="gold"
                />
                <Slice
                  pct="Remainder"
                  label="Running fivefold"
                  body="Whatever is left after the two above."
                />
              </div>

              <div className="border-t border-ink-800 px-6 py-5">
                <p className="text-sm leading-relaxed text-paper-300">
                  The prize pool then divides across the three tiers:{" "}
                  <span className="text-gold-400">40%</span> to a five-match jackpot,{" "}
                  <span className="text-paper-100">35%</span> to four matches,{" "}
                  <span className="text-paper-100">25%</span> to three. Anyone on the same
                  tier shares it equally. If nobody matches five, the jackpot rolls into
                  next month and keeps growing.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ------------------------------------------------------ verification */}
        <Reveal delay={250}>
          <section className="mt-12">
            <p className="eyebrow">Claiming</p>
            <h2 className="mt-3 font-display text-3xl">Only winners get checked.</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-paper-300">
              Match three or more and we&apos;ll ask for a screenshot of those five scores
              from your golf platform. Someone reviews it, and once it&apos;s approved the
              prize is paid. Nobody else is ever asked to prove anything — there&apos;s no
              reason to.
            </p>
          </section>
        </Reveal>

        {/* -------------------------------------------------------------- cta */}
        <Reveal delay={300}>
          <section className="card mt-12 p-10 text-center">
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">
              {stats.charity_total_pence > 0
                ? `${money(stats.charity_total_pence)} has already gone somewhere useful.`
                : "Your round is worth more than a scorecard."}
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-paper-300">
              £12 a month, or £120 for the year. Cancel whenever — you keep the time you
              paid for, and you stay in that month&apos;s draw.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/subscribe" className="btn-primary">
                Join fivefold
              </Link>
              <Link href="/charities" className="btn-ghost">
                See the causes
              </Link>
            </div>
          </section>
        </Reveal>
      </main>

      <SiteFooter />
    </>
  );
}

function Slice({ pct, label, body, tone }) {
  const colour =
    tone === "gold"
      ? "text-gold-400"
      : tone === "moss"
        ? "text-moss-300"
        : "text-paper-200";

  return (
    <div className="bg-ink-900 px-6 py-7">
      <p className={`font-display text-3xl ${colour}`}>{pct}</p>
      <p className="mt-2 font-medium">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{body}</p>
    </div>
  );
}
