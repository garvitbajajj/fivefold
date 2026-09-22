import Link from "next/link";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { money, monthName, shortDate } from "@/lib/format";
import { ProofUpload } from "./proof-upload";

export const metadata = { title: "Winnings" };

/**
 * Every win, and what it is waiting on.
 *
 * A prize moves through two gates: verification of the score screenshot, then
 * payment. Each card states plainly which gate it is at and whose turn it is
 * to act, so nobody has to guess why money has not arrived.
 */
export default async function WinningsPage() {
  const session = await requireSession("/dashboard/winnings");
  const supabase = await createClient();

  const { data: winners } = await supabase
    .from("winners")
    .select("*, draws(period, numbers, status), draw_entries(numbers)")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  const rows = winners ?? [];
  const total = rows.reduce((s, w) => s + w.prize_pence, 0);
  const paid = rows
    .filter((w) => w.payment_status === "paid")
    .reduce((s, w) => s + w.prize_pence, 0);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl">Your winnings</h1>
          <p className="mt-1.5 text-paper-300">
            Upload proof of your scores and we&apos;ll release the money.
          </p>
        </div>

        <div className="flex gap-8">
          <div>
            <p className="text-xs text-ink-500">Total won</p>
            <p className="font-display text-3xl tnum text-gold-400">{money(total)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Received</p>
            <p className="font-display text-3xl tnum">{money(paid)}</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-display text-xl">No wins yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            Keep five scores logged and you&apos;re entered every month. Match three or
            more and the prize lands here.
          </p>
          <Link href="/dashboard/scores" className="btn-ghost mt-6 !py-2 text-sm">
            Check my scores
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((win) => {
            const drawn = win.draws?.numbers ?? [];
            const mine = win.draw_entries?.numbers ?? [];

            return (
              <article key={win.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4 p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-2xl">
                        {win.draws ? monthName(win.draws.period) : "Draw"}
                      </h2>
                      <span className="pill !text-[0.625rem] text-gold-400">
                        {win.tier} numbers matched
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {mine.map((n, i) => (
                        <span
                          key={i}
                          className={`ball !h-10 !w-10 !text-base ${drawn.includes(n) ? "ball-hit" : ""}`}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="font-display text-4xl tnum text-gold-400">
                    {money(win.prize_pence)}
                  </p>
                </div>

                {/* -------------------------------------------- what happens next */}
                <div className="border-t border-ink-800 px-6 py-5">
                  {win.payment_status === "paid" ? (
                    <p className="text-sm text-moss-300">
                      Paid{win.paid_at ? ` on ${shortDate(win.paid_at)}` : ""}. Enjoy it.
                    </p>
                  ) : win.verification_status === "approved" ? (
                    <div>
                      <p className="text-sm text-moss-300">
                        Verified. Payment is being processed.
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        Nothing more needed from you.
                      </p>
                    </div>
                  ) : win.verification_status === "rejected" ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-clay-400">
                          We couldn&apos;t verify that screenshot.
                        </p>
                        {win.verification_note && (
                          <p className="mt-1 text-sm text-paper-300">
                            {win.verification_note}
                          </p>
                        )}
                      </div>
                      <ProofUpload winnerId={win.id} rejected />
                    </div>
                  ) : win.proof_url ? (
                    <div>
                      <p className="text-sm text-gold-300">
                        Proof received — we&apos;re checking it.
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        You&apos;ll be paid once it&apos;s approved.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-paper-200">
                          Send us a screenshot of these five scores from your golf
                          platform.
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                          PNG, JPEG or WebP, up to 5MB. Only you and our reviewers can see
                          it.
                        </p>
                      </div>
                      <ProofUpload winnerId={win.id} />
                    </div>
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
