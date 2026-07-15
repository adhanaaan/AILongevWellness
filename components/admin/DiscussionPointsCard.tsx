import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function DiscussionPointsCard({ points }: { points: string[] }) {
  if (points.length === 0) return null;
  return (
    <Card>
      <h3 className="flex items-center gap-2 text-label-md text-charcoal">
        <MessageCircle size={16} className="text-sage-dark" />
        Suggested discussion points
      </h3>
      <ul className="mt-3 space-y-2">
        {points.map((point) => (
          <li key={point} className="text-body-md text-charcoal">
            • {point}
          </li>
        ))}
      </ul>
    </Card>
  );
}
