"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ClipboardCheck, Download, Settings as SettingsIcon } from "lucide-react";
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

  return (
    <div className="flex min-h-screen bg-bone">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-5 py-6">
          <p className="text-label-md font-semibold text-sage-dark">AI Wellness</p>
          <p className="text-caption text-ink-muted">Admin Portal</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === "/admin" && pathname.startsWith("/admin/participants"));
            return (
              <Link
                key={href}
                href={href}
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

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-5">
          <h1 className="text-headline-lg text-charcoal">{title}</h1>
          {headerActions}
        </header>
        <main className="px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
