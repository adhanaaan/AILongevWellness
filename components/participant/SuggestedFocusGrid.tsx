import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface SuggestedFocusGridProps {
  items: string[];
}

export function SuggestedFocusGrid({ items }: SuggestedFocusGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Card key={item} padding="sm" className="flex flex-col items-start gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-tint text-sage-dark">
            <Sparkles size={16} />
          </span>
          <span className="text-label-md text-charcoal">{item}</span>
        </Card>
      ))}
    </div>
  );
}
