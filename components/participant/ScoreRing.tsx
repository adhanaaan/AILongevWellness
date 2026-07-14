import { cn } from "@/lib/utils/cn";

export interface ScoreRingProps {
  value: number; // 0-100
  label: string;
  status: "good" | "monitor";
  size?: number;
}

export function ScoreRing({ value, label, status, size = 88 }: ScoreRingProps) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const color = status === "good" ? "#6B9080" : "#E98A6D";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="ring-chart">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#F3F1EA" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-headline-md text-charcoal">
          {value}
        </div>
      </div>
      <span className={cn("text-label-md", status === "good" ? "text-sage-dark" : "text-terracotta-ink")}>
        {label}
      </span>
    </div>
  );
}
