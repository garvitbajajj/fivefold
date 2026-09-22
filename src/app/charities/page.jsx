import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { Reveal } from "@/components/reveal";
import { createClient } from "@/lib/supabase/server";
import { getCharityTotals } from "@/lib/stats";
import { money } from "@/lib/format";

export const metadata = {
  title: "Charities",
  description:
    "Every cause on fivefold, and how much each has received from members' subscriptions.",
};

/**
 * The directory.
 *
 * Search and category filter both live in the URL and are applied on the
 * server. No client-side state, no hydration cost, and a filtered view can be
 * bookmarked or shared — which is what you want from a charity list.
 */
export default async function CharitiesPage({ searchParams }) {
  const { q, category } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("charities").select("*").eq("is_active", true);
  if (category) query = query.eq("category", category);
  // Match the name, tagline or description, case-insensitively.
  if (q)
    query = query.or(`name.ilike.%${q}%,tagline.ilike.%${q}%,description.ilike.%${q}%`);

  const [{ data: charities }, { data: all }, totals] = await Promise.all([
    query.order("is_featured", { ascending: false }).order("name"),
    supabase.from("charities").select("category").eq("is_active", true),
    getCharityTotals(),
  ]);

  const categories = [...new Set((all ?? []).map((c) => c.category))].sort();
  const results = charities ?? [];
  const raisedTotal = Object.values(totals).reduce((s, t) => s + t.raised, 0);

  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <Reveal>
          <p className="eyebrow">The directory</p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
            Eight causes. Pick the one that keeps you up at night.
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-paper-300">
            Members have sent {money(raisedTotal)} to these organisations so far — a share
            of every subscription, every month, whether anyone wins or not.
          </p>
        </Reveal>

        {/* --------------------------------------------------------- filters */}
        <Reveal delay={100}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <form className="flex gap-2">
              {category && <input type="hidden" name="category" value={category} />}
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search causes"
                aria-label="Search causes"
                className="input !py-2.5 text-sm sm:w-64"
              />
              <button type="submit" className="btn-ghost !py-2.5 text-sm">
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <FilterChip label="All" href="/charities" active={!category} />
              {categories.map((cat) => (
                <FilterChip
                  key={cat}
                  label={cat}
                  active={category === cat}
                  href={`/charities?category=${encodeURIComponent(cat)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                />
              ))}
            </div>
          </div>
        </Reveal>

        {/* ---------------------------------------------------------- results */}
        {results.length === 0 ? (
          <div className="card mt-10 p-14 text-center">
            <p className="font-display text-xl">Nothing matches that.</p>
            <p className="mt-2 text-sm text-ink-500">
              Try a different word, or clear the filters.
            </p>
            <Link href="/charities" className="btn-ghost mt-6 !py-2 text-sm">
              Show all causes
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((charity, i) => {
              const raised = totals[charity.id]?.raised ?? 0;
              const supporters = totals[charity.id]?.supporters ?? 0;

              return (
                <Reveal key={charity.id} delay={Math.min(i * 70, 350)}>
                  <Link
                    href={`/charities/${charity.slug}`}
                    className="card card-hover flex h-full flex-col p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="pill text-moss-400">{charity.category}</span>
                      {charity.is_featured && (
                        <span className="pill text-gold-400">Spotlight</span>
                      )}
                    </div>

                    <h2 className="mt-4 font-display text-2xl leading-tight">
                      {charity.name}
                    </h2>
                    <p className="mt-2 text-sm text-paper-300">{charity.tagline}</p>
                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-500">
                      {charity.description}
                    </p>

                    <div className="mt-5 flex items-end justify-between border-t border-ink-700 pt-4">
                      <div>
                        <p className="font-display text-xl tnum text-moss-300">
                          {money(raised)}
                        </p>
                        <p className="text-xs text-ink-500">
                          from {supporters} member{supporters === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-sm text-gold-400">Read more →</span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

function FilterChip({ label, href, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`pill transition-colors ${
        active
          ? "border-gold-400 text-gold-400"
          : "border-ink-600 text-paper-300 hover:border-paper-300"
      }`}
    >
      {label}
    </Link>
  );
}
