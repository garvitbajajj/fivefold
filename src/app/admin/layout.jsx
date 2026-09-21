import Link from "next/link";
import { Wordmark } from "@/components/site-chrome";
import { DashboardNav } from "@/components/dashboard-nav";
import { signOut } from "@/app/(auth)/actions";
import { requireAdmin } from "@/lib/session";

const LINKS = [
  { href: "/admin", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/draws", label: "Draws" },
  { href: "/admin/charities", label: "Charities" },
  { href: "/admin/winners", label: "Winners" },
];

export default async function AdminLayout({ children }) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      {/* A gold hairline across the top so it is never ambiguous whether you
          are looking at the admin panel or the member dashboard. */}
      <div className="h-0.5 bg-gold-400" />

      <header className="border-b border-ink-800 bg-ink-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="pill border-gold-400 text-gold-400">Admin</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-paper-300 transition-colors hover:text-paper-50"
            >
              My dashboard
            </Link>
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
