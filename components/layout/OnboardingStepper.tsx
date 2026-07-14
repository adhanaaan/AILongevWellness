"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  { href: "/", label: "Welcome" },
  { href: "/onboarding/consent", label: "Consent" },
  { href: "/onboarding/profile", label: "Profile" },
  { href: "/capture", label: "Capture" },
];

export function OnboardingStepper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIndex = Math.max(0, STEPS.findIndex((s) => s.href === pathname));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bone">
      <div className="flex items-center justify-center gap-2 px-5 pt-6">
        {STEPS.map((step, i) => (
          <span
            key={step.href}
            aria-label={step.label}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === activeIndex ? "w-8 bg-sage" : i < activeIndex ? "w-4 bg-sage-dark" : "w-4 bg-surface-muted"
            )}
          />
        ))}
      </div>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
