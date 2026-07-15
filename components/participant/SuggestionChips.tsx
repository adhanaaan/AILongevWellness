"use client";

export interface SuggestionChipsProps {
  items: string[];
  onPick: (item: string) => void;
}

export function SuggestionChips({ items, onPick }: SuggestionChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="shrink-0 rounded-full border border-border-strong bg-surface px-4 py-2 text-label-md text-sage-dark hover:bg-sage-tint"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
