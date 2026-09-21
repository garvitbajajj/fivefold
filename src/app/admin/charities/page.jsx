import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getCharityTotals } from "@/lib/stats";
import { CharityEditor } from "./charity-editor";

export const metadata = { title: "Charities" };

export default async function AdminCharitiesPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Admins see retired charities too, so the RLS policy's is_admin() branch
  // matters here — a visitor querying the same table gets only active rows.
  const [{ data: charities }, totals] = await Promise.all([
    supabase
      .from("charities")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name"),
    getCharityTotals(),
  ]);

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl">Charities</h1>
        <p className="mt-1.5 text-paper-300">
          Add causes, edit their story, and pick who holds the homepage spotlight.
        </p>
      </div>

      <CharityEditor charities={charities ?? []} totals={totals} />

      <p className="mt-6 text-sm leading-relaxed text-ink-500">
        A charity that has already received money is retired rather than deleted —
        removing the row would orphan the payment history behind every supporter&apos;s
        receipt. Retired causes disappear from the directory but their totals stay intact.
      </p>
    </>
  );
}
