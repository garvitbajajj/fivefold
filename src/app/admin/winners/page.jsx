import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { money, monthName, shortDate } from "@/lib/format";
import { ReviewPanel } from "./review-panel";

export const metadata = { title: "Winners" };

/**
 * Every winner, newest draw first, with the proof they uploaded.
 *
 * Proof lives in a private storage bucket, so the page mints a short-lived
 * signed URL per claim rather than exposing the bucket. The links expire in an
 * hour, which is longer than any review takes and short enough that a copied
 * URL is not a lasting leak.
 */
export default async function AdminWinnersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: winners } = await supabase
    .from("winners")
    .select("*, draws(period, status, numbers), draw_entries(numbers)")
    .order("created_at", { ascending: false });

  const rows = winners ?? [];

  // Names come from profiles, which winners does not join to directly.
  const { data: profiles } = await supabase.from("profiles").select("id, full_name");
  const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

  const signed = await Promise.all(
    rows.map(async (w) => {
      if (!w.proof_url) return null;
      const { data } = await supabase.storage
        .from("winner-proof")
        .createSignedUrl(w.proof_url, 3600);
      return data?.signedUrl ?? null;
    }),
  );

  const pending = rows.filter(
    (w) => w.verification_status === "pending" && w.proof_url,
  ).length;
  const owed = rows
    .filter((w) => w.verification_status === "approved" && w.payment_status === "pending")
    .reduce((s, w) => s + w.prize_pence, 0);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Winners</h1>
          <p className="mt-1.5 text-paper-300">
            Check the proof, then release the money.
          </p>
        </div>

        <div className="flex gap-8 text-right">
          <div>
            <p className="text-xs text-ink-500">Awaiting review</p>
            <p className="font-display text-2xl tnum text-gold-400">{pending}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Approved, unpaid</p>
            <p className="font-display text-2xl tnum">{money(owed)}</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-paper-300">No winners yet.</p>
          <p className="mt-1.5 text-sm text-ink-500">
            They appear here as soon as a draw with matches is simulated.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((winner, i) => {
            const drawn = winner.draws?.numbers ?? [];
            const entry = winner.draw_entries?.numbers ?? [];

            return (
              <article key={winner.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-xl">
                        {nameById[winner.user_id] ?? "Member"}
                      </h2>
                      <span className="pill !text-[0.625rem] text-gold-400">
                        {winner.tier} match
                      </span>
                      <span className="pill !text-[0.625rem] text-ink-500">
                        {winner.draws ? monthName(winner.draws.period) : "—"}
                      </span>
                      {winner.draws?.status !== "published" && (
                        <span className="pill !text-[0.625rem] text-ink-500">
                          draw unpublished
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {entry.map((n, j) => (
                        <span
                          key={j}
                          className={`ball !h-8 !w-8 !text-xs ${drawn.includes(n) ? "ball-hit" : ""}`}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-display text-3xl tnum text-gold-400">
                      {money(winner.prize_pence)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {winner.payment_status === "paid" && winner.paid_at
                        ? `Paid ${shortDate(winner.paid_at)}`
                        : winner.verification_status}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-800 px-6 py-4">
                  <ReviewPanel winner={winner} />

                  {signed[i] && (
                    <a
                      href={signed[i]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost !py-2 text-sm"
                    >
                      View proof
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
