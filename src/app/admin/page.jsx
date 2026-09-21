import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getPlatformStats, getCharityTotals } from "@/lib/stats";
import { money, monthName, shortDate } from "@/lib/format";

export const metadata = { title: "Reports" };

/**
 * Reports and analytics: the four figures the brief asks for — total users,
 * total prize pool, charity contribution totals and draw statistics — plus the
 * queues that need attention today.
 */
export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [stats, charityTotals, { data: charities }, { data: draws }, { data: pending }] =
    await Promise.all([
      getPlatformStats(),
      getCharityTotals(),
      supabase.from("charities").select("id, name, is_active"),
      supabase.from("draws").select("*").order("period", { ascending: false }).limit(6),
      supabase.from("winners").select("id").eq("verification_status", "pending"),
    ]);

  const drawList = draws ?? [];
  const published = drawList.filter((d) => d.status === "published");
  const awaitingReview = pending?.length ?? 0;

  // Charity leaderboard, biggest recipient first.
  const leaderboard = (charities ?? [])
    .map((c) => ({
      ...c,
      raised: charityTotals[c.id]?.raised ?? 0,
      supporters: charityTotals[c.id]?.supporters ?? 0,
    }))
    .sort((a, b) => b.raised - a.raised);

  const avgEntrants = published.length
    ? Math.round(published.reduce((s, d) => s + d.entrant_count, 0) / published.length)
    : 0;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Reports</h1>
          <p className="mt-1.5 text-paper-300">Where the platform stands right now.</p>
        </div>

        {awaitingReview > 0 && (
          <Link href="/admin/winners" className="btn-primary !py-2.5 text-sm">
            {awaitingReview} claim{awaitingReview === 1 ? "" : "s"} to review
          </Link>
        )}
      </div>

      {/* ------------------------------------------------------- headline figures */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total users"
          value={stats.total_users.toLocaleString("en-GB")}
          sub={`${stats.active_subscribers} subscribing`}
        />
        <Stat
          label="Prize pool raised"
          value={money(stats.pool_total_pence)}
          sub={`${money(stats.current_pool_pence)} live this month`}
          tone="gold"
        />
        <Stat
          label="To charity"
          value={money(stats.charity_total_pence)}
          sub={`across ${stats.charities_count} causes`}
          tone="moss"
        />
        <Stat
          label="Paid to winners"
          value={money(stats.paid_out_pence)}
          sub={`${stats.winners_total} wins recorded`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* -------------------------------------------------------- draw stats */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-700 px-6 py-5">
            <div>
              <p className="eyebrow">Draw statistics</p>
              <h2 className="mt-2 font-display text-xl">
                {stats.draws_published} published
              </h2>
            </div>
            <Link href="/admin/draws" className="btn-ghost !py-2 text-sm">
              Manage draws
            </Link>
          </div>

          {drawList.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-500">
              No draws yet. Run the first simulation from the draws tab.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 divide-x divide-ink-800 border-b border-ink-800">
                <div className="px-6 py-4">
                  <dt className="text-xs text-ink-500">Average entrants</dt>
                  <dd className="mt-1 font-display text-2xl tnum">{avgEntrants}</dd>
                </div>
                <div className="px-6 py-4">
                  <dt className="text-xs text-ink-500">Jackpot rolling</dt>
                  <dd className="mt-1 font-display text-2xl tnum text-gold-400">
                    {money(published[0]?.carry_out_pence ?? 0)}
                  </dd>
                </div>
              </dl>

              <ul className="divide-y divide-ink-800">
                {drawList.map((draw) => (
                  <li key={draw.id} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="w-28 shrink-0 text-sm">
                      {monthName(draw.period)}
                    </span>
                    <span
                      className={`pill shrink-0 !text-[0.625rem] ${
                        draw.status === "published"
                          ? "text-moss-400"
                          : draw.status === "simulated"
                            ? "text-gold-400"
                            : "text-ink-500"
                      }`}
                    >
                      {draw.status}
                    </span>
                    <span className="flex-1 text-right text-sm tnum text-ink-500">
                      {draw.entrant_count} in
                    </span>
                    <span className="w-24 text-right text-sm tnum">
                      {money(draw.pool_pence)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ------------------------------------------------- charity leaderboard */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-700 px-6 py-5">
            <div>
              <p className="eyebrow">Charity contributions</p>
              <h2 className="mt-2 font-display text-xl">
                {money(stats.charity_total_pence)} directed
              </h2>
            </div>
            <Link href="/admin/charities" className="btn-ghost !py-2 text-sm">
              Manage
            </Link>
          </div>

          {leaderboard.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-500">
              No charities listed.
            </p>
          ) : (
            <ul className="divide-y divide-ink-800">
              {leaderboard.map((charity) => {
                const share = stats.charity_total_pence
                  ? (charity.raised / stats.charity_total_pence) * 100
                  : 0;

                return (
                  <li key={charity.id} className="px-6 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm">
                        {charity.name}
                        {!charity.is_active && (
                          <span className="ml-2 text-xs text-ink-600">retired</span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm tnum text-moss-300">
                        {money(charity.raised)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
                        <div
                          className="h-full bg-moss-500"
                          style={{
                            width: `${Math.max(share, charity.raised > 0 ? 2 : 0)}%`,
                          }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs text-ink-500">
                        {charity.supporters} backer{charity.supporters === 1 ? "" : "s"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Independent donations are tracked separately: they never touch the
          prize pool, so mixing them into the figures above would overstate it. */}
      {stats.donation_total_pence > 0 && (
        <p className="mt-6 text-sm text-ink-500">
          Includes {money(stats.donation_total_pence)} in one-off donations, which sit
          outside the game and contribute nothing to the prize pool.
        </p>
      )}
    </>
  );
}

function Stat({ label, value, sub, tone }) {
  const colour =
    tone === "gold"
      ? "text-gold-400"
      : tone === "moss"
        ? "text-moss-300"
        : "text-paper-50";

  return (
    <div className="card p-5">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-2 font-display text-3xl tnum ${colour}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}
