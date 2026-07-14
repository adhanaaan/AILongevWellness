import Link from "next/link";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <p className="text-label-md tracking-wide text-sage-dark">AI WELLNESS</p>
      <h1 className="mt-4 text-headline-lg text-charcoal">Your personalised longevity snapshot</h1>
      <p className="mt-3 max-w-xs text-body-md text-ink-muted">
        A guided wellness check — about 30 minutes.
      </p>

      <div className="mt-10 flex w-full max-w-xs flex-col items-center gap-3">
        <Link href="/onboarding/consent" className="w-full">
          <Button className="w-full" size="lg">
            Begin
          </Button>
        </Link>
        <Link href="/onboarding/consent" className="w-full">
          <Button className="w-full" size="lg" variant="secondary" iconLeft={<ScanLine size={18} />}>
            Scan the retreat QR code to start
          </Button>
        </Link>
      </div>
    </div>
  );
}
