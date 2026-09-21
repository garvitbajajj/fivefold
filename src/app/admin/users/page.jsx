import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { UserRow } from "./user-row";

export const metadata = { title: "Users" };

/**
 * Member management: profiles, their subscription, their scores.
 *
 * Everything is assembled from four flat queries rather than one nested
 * select. Postgres returns the rows quickly either way, and grouping in
 * JavaScript keeps the query readable — this list is administrative and small,
 * so there is nothing to gain from being clever about it.
 */
export default async function AdminUsersPage({ searchParams }) {
  await requireAdmin();
  const { q } = await searchParams;
  const supabase = await createClient();

  const [{ data: profiles }, { data: subs }, { data: scores }, { data: winners }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*, charities(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("scores").select("*").order("played_on", { ascending: false }),
      supabase.from("winners").select("user_id, prize_pence"),
    ]);

  // Most recent subscription per user — the list is already newest first.
  const subByUser = {};
  for (const sub of subs ?? []) subByUser[sub.user_id] ??= sub;

  const scoresByUser = {};
  for (const score of scores ?? []) (scoresByUser[score.user_id] ??= []).push(score);

  const wonByUser = {};
  for (const w of winners ?? [])
    wonByUser[w.user_id] = (wonByUser[w.user_id] ?? 0) + w.prize_pence;

  let users = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role,
    charity: p.charities?.name ?? null,
    charity_percent: p.charity_percent,
    created_at: p.created_at,
    subscription: subByUser[p.id] ?? null,
    scores: scoresByUser[p.id] ?? [],
    won: wonByUser[p.id] ?? 0,
  }));

  if (q) {
    const needle = q.toLowerCase();
    users = users.filter((u) => (u.full_name ?? "").toLowerCase().includes(needle));
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Users</h1>
          <p className="mt-1.5 text-paper-300">
            {users.length} member{users.length === 1 ? "" : "s"}. Open one to edit their
            scores or end a subscription.
          </p>
        </div>

        {/* Plain GET form: the search lives in the URL, so it survives a
            refresh and can be shared. No client state needed. */}
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name"
            aria-label="Search members by name"
            className="input !py-2 text-sm sm:w-56"
          />
          <button type="submit" className="btn-ghost !py-2 text-sm">
            Search
          </button>
        </form>
      </div>

      {users.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-paper-300">
            {q ? `Nobody matching “${q}”.` : "No members yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      )}
    </>
  );
}
