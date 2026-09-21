import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/charities", label: "Charities" },
  { href: "/results", label: "Results" },
];

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-display text-xl tracking-tight ${className}`}>
      five<span className="text-gold-400">fold</span>
      <span className="text-gold-400">.</span>
    </Link>
  );
}

/**
 * Public site header. A Server Component so the signed-in state is correct on
 * first paint — no flash of "Sign in" for a user who is already logged in.
 *
 * The mobile menu is a plain <details> element: it opens, closes, traps no
 * focus and ships no JavaScript.
 */
export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Wordmark />

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-paper-300 transition-colors hover:text-paper-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Link href="/dashboard" className="btn-ghost !px-5 !py-2 text-sm">
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-paper-300 transition-colors hover:text-paper-50"
            >
              Sign in
            </Link>
          )}
          <Link href="/subscribe" className="btn-primary !px-5 !py-2 text-sm">
            Join fivefold
          </Link>
        </div>

        <details className="group relative md:hidden">
          <summary
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-ink-700"
            aria-label="Menu"
          >
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
              <path d="M0 1h18M0 6h18M0 11h18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-3 w-56 rounded-xl border border-ink-700 bg-ink-900 p-2 shadow-2xl">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2.5 text-sm text-paper-200 hover:bg-ink-800"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={user ? "/dashboard" : "/login"}
              className="block rounded-lg px-3 py-2.5 text-sm text-paper-200 hover:bg-ink-800"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
            <Link href="/subscribe" className="btn-primary mt-2 w-full !py-2.5 text-sm">
              Join fivefold
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink-800 bg-ink-950">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-xs">
            <Wordmark />
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Five scores. One draw a month. A share of every subscription going
              somewhere that needs it.
            </p>
          </div>

          <div className="flex gap-12 text-sm">
            <div className="space-y-2.5">
              <p className="eyebrow">Platform</p>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-paper-300 transition-colors hover:text-paper-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="space-y-2.5">
              <p className="eyebrow">Account</p>
              <Link
                href="/login"
                className="block text-paper-300 transition-colors hover:text-paper-50"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="block text-paper-300 transition-colors hover:text-paper-50"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-ink-800 pt-6 text-xs text-ink-500">
          Built as a sample assignment against the Digital Heroes PRD. Payments are
          simulated; no real money moves.
        </p>
      </div>
    </footer>
  );
}
