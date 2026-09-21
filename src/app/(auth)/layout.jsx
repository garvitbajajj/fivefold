import Link from "next/link";
import { Wordmark } from "@/components/site-chrome";
/**
 * Auth screens get their own chrome: no nav, no footer, nothing to click away
 * from. Just the mark, the form, and the way back.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-5 py-6 sm:px-8">
        <Wordmark />
        <Link
          href="/"
          className="text-sm text-ink-500 transition-colors hover:text-paper-200"
        >
          Back to site
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
