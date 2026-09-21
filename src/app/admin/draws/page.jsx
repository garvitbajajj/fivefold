import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { money, monthName, shortDate } from "@/lib/format";
import { Simulator, PublishPanel } from "./draw-controls";

export const metadata = { title: "Draws" };

const TIER_SHARE = { 5: 40, 4: 35, 3: 25 };

export default async function AdminDrawsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: draws } = await supabase
    .from("draws")
    .select("*, winners(id, tier, prize_pence, user_id), draw_entries(id, match_count)")
    .order("period", { ascending: false });

  const drawList = draws ?? [];

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl">Draws</h1>
        <p className="mt-1.5 text-paper-300">
          One draw per month. Simulate, check the payouts, then publish.
        </p>
      </div>

      <Simulator />

      <div className="mt-8 space-y-5">
        {drawList.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-paper-300">No draws yet.</p>
            <p className="mt-1.5 text-sm text-ink-500">
              Run a simulation above to see what this month would pay out.
            </p>
          </div>
        ) : (
          drawList.map((draw) => {
            const winners = draw.winners ?? [];
            const entries = draw.draw_entries ?? [];
            const payout = winners.reduce((s, w) => s + w.prize_pence, 0);

            // Distribution of match counts, to show at a glance whether the
            // draw behaved sensibly.
            const spread = [0, 1, 2, 3, 4, 5].map((n) => ({
              n,
              count: entries.filter((e) => e.match_count === n).length,
            }));

            return (
              <article key={draw.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-display text-2xl">{monthName(draw.period)}</h2>
                      <span
                        className={`pill !text-[0.625rem] ${
                          draw.status === "published"
                            ? "text-moss-400"
                            : draw.status === "simulated"
                              ? "text-gold-400"
                              : "text-ink-500"
                        }`}
                      >
                        {draw.status}
                      </span>
                      <span className="pill !text-[0.625rem] text-ink-500">
                        {draw.mode}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-ink-500">
                      {draw.published_at
                        ? `Published ${shortDate(draw.published_at)}`
                        : draw.simulated_at
                          ? `Simulated ${shortDate(draw.simulated_at)}`
                          : "Not yet run"}
                      {draw.carry_in_pence > 0 &&
                        ` · ${money(draw.carry_in_pence)} rolled in`}
                    </p>
                  </div>

                  {draw.numbers && (
                    <div className="flex flex-wrap gap-2">
                      {draw.numbers.map((n, i) => (
                        <span
                          key={i}
                          className="ball ball-hit !h-10 !w-10 !text-base"
                          style={{
                            animation: "var(--animate-ball)",
                            animationDelay: `${i * 80}ms`,
                          }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-px border-y border-ink-800 bg-ink-800 sm:grid-cols-4">
                  <Cell label="Pool" value={money(draw.pool_pence)} tone="gold" />
                  <Cell label="Entrants" value={draw.entrant_count.toString()} />
                  <Cell label="Winners" value={winners.length.toString()} />
                  <Cell
                    label={draw.carry_out_pence > 0 ? "Rolling over" : "Paid out"}
                    value={money(
                      draw.carry_out_pence > 0 ? draw.carry_out_pence : payout,
                    )}
                  />
                </dl>

                {entries.length > 0 && (
                  <div className="px-6 py-5">
                    <p className="eyebrow">Match spread</p>
                    <div className="mt-3 flex flex-wrap gap-4">
                      {spread.map(({ n, count }) => {
                        const tierPot =
                          n >= 3
                            ? Math.floor((draw.pool_pence * TIER_SHARE[n]) / 100)
                            : 0;

                        return (
                          <div key={n} className="min-w-20">
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className={`font-mono text-xs ${n >= 3 ? "text-gold-400" : "text-ink-500"}`}
                              >
                                {n} match
                              </span>
                              <span className="font-display text-lg tnum">{count}</span>
                            </div>
                            {n >= 3 && (
                              <p className="mt-0.5 text-xs text-ink-500">
                                {count > 0
                                  ? `${money(Math.floor(tierPot / count))} each`
                                  : `${money(tierPot)} unclaimed`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {draw.status === "simulated" && (
                  <PublishPanel
                    draw={draw}
                    winnerCount={winners.length}
                    payout={payout}
                  />
                )}
              </article>
            );
          })
        )}
      </div>
    </>
  );
}

function Cell({ label, value, tone }) {
  return (
    <div className="bg-ink-900 px-6 py-4">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd
        className={`mt-1 font-display text-2xl tnum ${tone === "gold" ? "text-gold-400" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
