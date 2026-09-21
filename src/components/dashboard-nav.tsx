"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Horizontal section nav for the dashboard and admin shells. Client-side only
 * because it needs the current path to mark the active tab; everything it
 * renders is a plain link.
 */
export function DashboardNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6">
      <ul className="flex gap-1">
        {links.map((link) => {
          // Only the index link needs an exact match, or it would stay lit on
          // every child route.
          const active =
            link.href === links[0].href
              ? pathname === link.href
              : pathname.startsWith(link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors ${
                  active
                    ? "border-gold-400 text-paper-50"
                    : "border-transparent text-ink-500 hover:text-paper-200"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
