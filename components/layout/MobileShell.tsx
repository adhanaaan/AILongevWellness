"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, MessageCircle, ClipboardList, Settings as SettingsIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/card", label: "Insights", icon: Sparkles },
  { href: "/ava", label: "Concierge", icon: MessageCircle },
  { href: "/tracking", label: "Care Plan", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function MobileShell({
  children,
  greeting = "Welcome back",
  name = "James",
}: {
  children: React.ReactNode;
  greeting?: string;
  name?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bone">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bone/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Avatar initials={name.slice(0, 1)} size="sm" />
          <div>
            <p className="text-caption text-ink-muted">{greeting}</p>
            <p className="text-label-md text-charcoal">{name}</p>
          </div>
        </div>
        <p className="text-label-md font-semibold text-sage-dark">AI Wellness</p>
      </header>

      <main className="flex-1 px-5 py-6">{children}</main>

      <nav className="sticky bottom-0 z-10 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-caption",
                  active ? "text-sage-dark" : "text-ink-muted"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
