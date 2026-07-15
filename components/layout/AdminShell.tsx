"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ClipboardCheck, Download, Settings as SettingsIcon, Menu, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin", label: "Participants", icon: Users },
  { href: "/admin/review-queue", label: "Review queue", icon: ClipboardCheck },
  { href: "/admin/exports", label: "Exports", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export function AdminShell({
  children,
  title,
  headerActions,
}: {
  children: ReactNode;
  title: string;
  headerActions?: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bone">
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-charcoal/40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 md:static md:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <div>
            <p className="text-label-md font-semibold text-sage-dark">AI Wellness</p>
            <p className="text-caption text-ink-muted">Admin Portal</p>
          </div>
          <button
            type="button"
            className="text-ink-muted md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === "/admin" && pathname.startsWith("/admin/participants"));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-label-md transition-colors",
                  active ? "bg-sage-tint text-sage-dark" : "text-ink-muted hover:bg-surface-muted"
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          <Avatar initials="HM" size="sm" />
          <div>
            <p className="text-label-md text-charcoal">Dr. Helena Marsh</p>
            <p className="text-caption text-ink-muted">Care team</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-4 md:px-8 md:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="shrink-0 text-charcoal md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="truncate text-headline-md text-charcoal md:text-headline-lg">{title}</h1>
          </div>
          {headerActions}
        </header>
        <main className="px-4 py-5 md:px-8 md:py-6">{children}</main>
      </div>
    </div>
  );
}
