import Link from "next/link";
import { Wordmark } from "@/components/site-chrome";
import { DashboardNav } from "@/components/dashboard-nav";
import { signOut } from "@/app/(auth)/actions";
import { requireSession } from "@/lib/session";
const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/scores", label: "My scores" },
  { href: "/dashboard/charity", label: "My cause" },
  { href: "/dashboard/winnings", label: "Winnings" },
];
export default async function DashboardLayout({ children }) {
  const session = await requireSession();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-800 bg-ink-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="hidden text-sm text-ink-500 sm:inline">/ dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {session.isAdmin && (
              <Link
                href="/admin"
                className="pill border-gold-400 text-gold-400 transition-colors hover:bg-gold-400/10"
              >
                Admin
              </Link>
            )}
            <span className="hidden text-sm text-ink-500 md:inline">{session.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-paper-300 transition-colors hover:text-paper-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <DashboardNav links={LINKS} />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
