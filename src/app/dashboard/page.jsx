import Link from "next/link";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { money, shortDate, relativeDays, monthName, splitPayment } from "@/lib/format";
/**
 * The overview covers all five modules the brief requires:
 * subscription status, scores, chosen charity, participation, and winnings.
 * Each block links through to the page that can change it.
 */
export default async function DashboardPage({ searchParams }) {
  const { welcome } = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();
  const [{ data: scores }, { data: entries }, { data: winnings }, { data: nextDraw }] =
    await Promise.all([
      supabase
        .from("scores")
        .select("*")
        .eq("user_id", session.userId)
        .order("played_on", { ascending: false }),
      supabase
        .from("draw_entries")
        .select("*, draws(period, status, numbers)")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false }),
      supabase.from("winners").select("*").eq("user_id", session.userId),
      supabase
        .from("draws")
        .select("*")
        .eq("status", "published")
        .order("period", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  const scoreList = scores ?? [];
  const entryList = entries ?? [];
  const winList = winnings ?? [];
  const publishedEntries = entryList.filter((e) => e.draws?.status === "published");
  const totalWon = winList.reduce((sum, w) => sum + w.prize_pence, 0);
  const paidOut = winList
    .filter((w) => w.payment_status === "paid")
    .reduce((sum, w) => sum + w.prize_pence, 0);
  const awaiting = winList.filter((w) => w.payment_status === "pending").length;
  const ticketReady = scoreList.length === 5 && session.isSubscribed;
  const split = session.subscription
    ? splitPayment(session.subscription.amount_pence, session.profile.charity_percent)
    : null;
  return (
    <>
      {welcome && (
        <div className="card mb-8 border-moss-500/40 bg-moss-500/5 p-5">
          <h2 className="font-display text-xl text-moss-300">You&apos;re in.</h2>
          <p className="mt-1.5 text-sm text-paper-300">
            Log five rounds and you&apos;ll be entered in the next monthly draw.
          </p>
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-display text-3xl">
          {session.profile.full_name?.split(" ")[0]
            ? `Hello, ${session.profile.full_name.split(" ")[0]}.`
            : "Your dashboard."}
        </h1>
        <p className="mt-2 text-paper-300">
          {ticketReady
            ? "Your ticket is complete. Nothing to do but wait for the draw."
            : session.isSubscribed
              ? `${5 - scoreList.length} more ${5 - scoreList.length === 1 ? "round" : "rounds"} and you're in the next draw.`
              : "Reactivate your subscription to get back in the draw."}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ------------------------------------------------- subscription */}
        <section className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow">Subscription</p>
            <StatusPill
              status={
                session.isSubscribed
                  ? session.subscription?.cancel_at_period_end
                    ? "ending"
                    : "active"
                  : (session.subscription?.status ?? "none")
              }
            />
          </div>

          {session.subscription ? (
            <>
              <p className="mt-4 font-display text-3xl capitalize">
                {session.subscription.plan}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {money(session.subscription.amount_pence)} per{" "}
                {session.subscription.plan === "yearly" ? "year" : "month"}
              </p>

              <dl className="mt-5 space-y-2 border-t border-ink-700 pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">
                    {session.subscription.cancel_at_period_end
                      ? "Access until"
                      : "Renews"}
                  </dt>
                  <dd className="text-right">
                    {shortDate(session.subscription.current_period_end)}
                    <span className="ml-1.5 text-ink-500">
                      ({relativeDays(session.subscription.current_period_end)})
                    </span>
                  </dd>
                </div>
              </dl>

              <Link
                href="/dashboard/charity"
                className="mt-5 inline-block text-sm text-gold-400 hover:text-gold-300"
              >
                Manage subscription →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-paper-300">
                You don&apos;t have a subscription yet, so you&apos;re not in the draw and
                nothing is reaching a charity.
              </p>
              <Link href="/subscribe" className="btn-primary mt-5 !py-2 text-sm">
                Join fivefold
              </Link>
            </>
          )}
        </section>

        {/* ------------------------------------------------------ charity */}
        <section className="card p-6">
          <p className="eyebrow">Your cause</p>

          {session.charity ? (
            <>
              <p className="mt-4 font-display text-2xl leading-tight">
                {session.charity.name}
              </p>
              <p className="mt-1.5 text-sm text-ink-500">{session.charity.tagline}</p>

              <div className="mt-5 border-t border-ink-700 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-500">Your share</span>
                  <span className="font-display text-2xl text-moss-300">
                    {session.profile.charity_percent}%
                  </span>
                </div>
                {split && (
                  <p className="mt-1.5 text-xs text-ink-500">
                    {money(split.charity)} of every{" "}
                    {money(session.subscription.amount_pence)} payment
                  </p>
                )}
              </div>

              <Link
                href="/dashboard/charity"
                className="mt-5 inline-block text-sm text-gold-400 hover:text-gold-300"
              >
                Change cause or share →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-paper-300">
                You haven&apos;t picked a cause yet.
              </p>
              <Link href="/charities" className="btn-ghost mt-5 !py-2 text-sm">
                Browse causes
              </Link>
            </>
          )}
        </section>

        {/* ----------------------------------------------------- winnings */}
        <section className="card p-6">
          <p className="eyebrow">Winnings</p>

          <p className="mt-4 font-display text-4xl tnum">{money(totalWon)}</p>
          <p className="mt-1 text-sm text-ink-500">
            across {winList.length} {winList.length === 1 ? "win" : "wins"}
          </p>

          <dl className="mt-5 space-y-2 border-t border-ink-700 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Paid out</dt>
              <dd className="tnum text-moss-300">{money(paidOut)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Awaiting payment</dt>
              <dd className="tnum">{awaiting}</dd>
            </div>
          </dl>

          <Link
            href="/dashboard/winnings"
            className="mt-5 inline-block text-sm text-gold-400 hover:text-gold-300"
          >
            {awaiting > 0 ? "Upload proof to get paid →" : "See your wins →"}
          </Link>
        </section>
      </div>

      {/* ---------------------------------------------------------- ticket */}
      <section className="card mt-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Your ticket</p>
            <h2 className="mt-2 font-display text-2xl">
              {scoreList.length === 5
                ? "Five scores, locked in"
                : `${scoreList.length} of 5 logged`}
            </h2>
          </div>
          <Link href="/dashboard/scores" className="btn-ghost !py-2 text-sm">
            {scoreList.length === 5 ? "Edit scores" : "Add a score"}
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {scoreList.map((score, i) => (
            <span
              key={score.id}
              className="ball"
              style={{ animation: "var(--animate-ball)", animationDelay: `${i * 70}ms` }}
              title={shortDate(score.played_on)}
            >
              {score.value}
            </span>
          ))}
          {Array.from({ length: 5 - scoreList.length }).map((_, i) => (
            <span key={`empty-${i}`} className="ball border-dashed text-ink-600">
              —
            </span>
          ))}
        </div>

        {!ticketReady && (
          <p className="mt-5 text-sm text-ink-500">
            {session.isSubscribed
              ? "A ticket needs all five numbers. Incomplete sets sit the month out."
              : "An active subscription is needed to enter the draw."}
          </p>
        )}
      </section>

      {/* --------------------------------------------------- participation */}
      <section className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 px-6 py-5">
          <div>
            <p className="eyebrow">Participation</p>
            <h2 className="mt-2 font-display text-2xl">
              {publishedEntries.length} {publishedEntries.length === 1 ? "draw" : "draws"}{" "}
              entered
            </h2>
          </div>
          {nextDraw && (
            <p className="text-sm text-ink-500">
              Last drawn {monthName(nextDraw.period)}
            </p>
          )}
        </div>

        {publishedEntries.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-500">
            You haven&apos;t been in a draw yet. Complete your five and the next one picks
            you up automatically.
          </p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {publishedEntries.slice(0, 6).map((entry) => {
              const drawn = entry.draws?.numbers ?? [];
              const win = winList.find((w) => w.draw_id === entry.draw_id);
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-4"
                >
                  <div className="w-28 shrink-0">
                    <p className="text-sm">{monthName(entry.draws.period)}</p>
                    <p className="text-xs text-ink-500">
                      {entry.match_count} match{entry.match_count === 1 ? "" : "es"}
                    </p>
                  </div>

                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {entry.numbers.map((n, i) => (
                      <span
                        key={i}
                        className={`ball !h-9 !w-9 !text-sm ${drawn.includes(n) ? "ball-hit" : ""}`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>

                  <div className="shrink-0 text-right">
                    {win ? (
                      <>
                        <p className="font-display text-lg tnum text-gold-400">
                          {money(win.prize_pence)}
                        </p>
                        <p className="text-xs text-ink-500">
                          {win.payment_status === "paid" ? "Paid" : "Pending"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-600">No win</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
function StatusPill({ status }) {
  const style = {
    active: "text-moss-400",
    ending: "text-gold-400",
    cancelled: "text-ink-500",
    lapsed: "text-clay-400",
    none: "text-ink-500",
  }[status];
  const label = {
    active: "Active",
    ending: "Ending soon",
    cancelled: "Cancelled",
    lapsed: "Lapsed",
    none: "Inactive",
  }[status];
  return <span className={`pill ${style}`}>{label}</span>;
}
