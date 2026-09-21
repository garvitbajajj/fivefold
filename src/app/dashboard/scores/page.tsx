import Link from "next/link";
import type { Metadata } from "next";
import { ScoreManager } from "./score-manager";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Score } from "@/lib/database.types";

export const metadata: Metadata = { title: "My scores" };

export default async function ScoresPage() {
  const session = await requireSession("/dashboard/scores");
  const supabase = await createClient();

  // Reverse chronological, newest first, per the brief.
  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", session.userId)
    .order("played_on", { ascending: false });

  return (
    <>
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl">Your scores</h1>
        <p className="mt-2 leading-relaxed text-paper-300">
          The five most recent rounds you log are your ticket. Log a sixth and
          the oldest drops off automatically.
        </p>
      </div>

      {!session.isSubscribed && (
        <div className="card mb-6 border-gold-600/40 bg-gold-400/5 p-5">
          <p className="text-sm text-gold-300">
            Your subscription isn&apos;t active, so scores are read-only and you
            aren&apos;t entered in the draw.
          </p>
          <Link href="/subscribe" className="btn-primary mt-4 !py-2 text-sm">
            Reactivate
          </Link>
        </div>
      )}

      <ScoreManager scores={(scores ?? []) as Score[]} locked={!session.isSubscribed} />
    </>
  );
}
