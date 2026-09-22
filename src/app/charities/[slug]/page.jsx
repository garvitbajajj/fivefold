import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { Reveal } from "@/components/reveal";
import { createClient } from "@/lib/supabase/server";
import { getCharityTotals } from "@/lib/stats";
import { money, shortDate, relativeDays } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("charities")
    .select("name, tagline")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return { title: "Charity not found" };
  return { title: data.name, description: data.tagline };
}

export default async function CharityProfilePage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: charity } = await supabase
    .from("charities")
    .select("*, charity_events(*)")
    .eq("slug", slug)
    .maybeSingle();

  // A retired charity keeps its page — old receipts link here — but a slug
  // that never existed is a genuine 404.
  if (!charity) notFound();

  const totals = await getCharityTotals();
  const raised = totals[charity.id]?.raised ?? 0;
  const supporters = totals[charity.id]?.supporters ?? 0;

  // Upcoming events only, soonest first.
  const today = new Date().toISOString().slice(0, 10);
  const events = (charity.charity_events ?? [])
    .filter((e) => e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <Reveal>
          <Link
            href="/charities"
            className="text-sm text-ink-500 transition-colors hover:text-paper-200"
          >
            ← All causes
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <span className="pill text-moss-400">{charity.category}</span>
            {charity.is_featured && <span className="pill text-gold-400">Spotlight</span>}
            {!charity.is_active && (
              <span className="pill text-ink-500">No longer listed</span>
            )}
          </div>

          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">
            {charity.name}
          </h1>
          <p className="mt-3 max-w-2xl text-xl text-paper-300">{charity.tagline}</p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_18rem] lg:items-start">
          <Reveal delay={100}>
            <div className="space-y-10">
              <section>
                <p className="eyebrow">Their work</p>
                <p className="mt-4 text-lg leading-relaxed text-paper-200">
                  {charity.description}
                </p>
              </section>

              {/* ------------------------------------------------ events */}
              {events.length > 0 && (
                <section>
                  <p className="eyebrow">Coming up</p>
                  <ul className="mt-4 space-y-3">
                    {events.map((event) => (
                      <li key={event.id} className="card p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-display text-xl">{event.title}</h3>
                          <span className="text-sm text-gold-400">
                            {relativeDays(event.event_date)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-500">
                          {shortDate(event.event_date)}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                        {event.description && (
                          <p className="mt-3 text-sm leading-relaxed text-paper-300">
                            {event.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </Reveal>

          {/* --------------------------------------------------- sidebar */}
          <Reveal delay={180}>
            <aside className="card sticky top-24 p-6">
              <p className="eyebrow">Raised through fivefold</p>
              <p className="mt-3 font-display text-4xl tnum text-moss-300">
                {money(raised)}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                from {supporters} member{supporters === 1 ? "" : "s"}
              </p>

              <div className="mt-6 space-y-3 border-t border-ink-700 pt-5 text-sm leading-relaxed text-paper-300">
                <p>
                  Choose {charity.name} when you join and at least 10% of everything you
                  pay goes straight to them — every month, win or lose.
                </p>
              </div>

              {charity.is_active ? (
                <Link
                  href="/subscribe"
                  className="btn-primary mt-6 w-full !py-2.5 text-sm"
                >
                  Back this cause
                </Link>
              ) : (
                <p className="mt-6 text-sm text-ink-500">
                  This cause is no longer taking new supporters.
                </p>
              )}
            </aside>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
