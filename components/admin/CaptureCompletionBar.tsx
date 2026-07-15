import { ProgressBar } from "@/components/ui/ProgressBar";

export function CaptureCompletionBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <ProgressBar value={value} tone={value >= 100 ? "sage" : "terracotta"} className="w-24" />
      <span className="text-caption text-ink-muted">{value}%</span>
    </div>
  );
}
