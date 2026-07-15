import { cn } from "@/lib/utils/cn";

export interface AvatarProps {
  src?: string;
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-caption",
  md: "h-10 w-10 text-label-md",
  lg: "h-14 w-14 text-headline-md",
};

export function Avatar({ src, initials, size = "md", className }: AvatarProps) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={initials} className={cn("rounded-full object-cover", SIZE_CLASSES[size], className)} />;
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-sage-tint font-semibold text-sage-dark",
        SIZE_CLASSES[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
