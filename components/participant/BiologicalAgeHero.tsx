export interface BiologicalAgeHeroProps {
  bioAge: number;
  chronoAge: number;
}

export function BiologicalAgeHero({ bioAge, chronoAge }: BiologicalAgeHeroProps) {
  const delta = chronoAge - bioAge;
  return (
    <div className="relative overflow-hidden rounded-lg bg-sage-tint p-6 text-center shadow-soft">
      <p className="text-label-md text-sage-dark">Your biological age</p>
      <p className="mt-1 text-display text-charcoal">{bioAge}</p>
      <div className="mt-2 flex items-center justify-center gap-2 text-body-md text-ink-muted">
        <span className="line-through">{chronoAge}</span>
        <span className="rounded-full bg-sage px-3 py-1 text-caption font-semibold text-white">
          {delta >= 0 ? `−${delta} years` : `+${Math.abs(delta)} years`}
        </span>
      </div>
    </div>
  );
}
