"use client";

import { cn } from "@/lib/utils/cn";
import type { Card } from "@/lib/game/types";

const SUIT_GLYPH: Record<Card["suit"], string> = {
  hearts: "M12 21s-7-4.35-9.3-8.1C.4 9.7 1.7 6 5.1 6c1.9 0 3.2 1.2 3.9 2.3C9.7 7.2 11 6 12.9 6c3.4 0 4.7 3.7 2.4 6.9C19 16.65 12 21 12 21z",
  diamonds: "M12 2 L20 12 L12 22 L4 12 Z",
  clubs:
    "M12 8a4 4 0 1 0-3.9 4A4 4 0 1 0 12 16.8 4 4 0 1 0 15.9 12 4 4 0 1 0 12 8zm-1.2 8.6h2.4L14 22h-4z",
  spades:
    "M12 2c4.8 5.2 8 8.6 8 12.1A5.1 5.1 0 0 1 12 18.4 5.1 5.1 0 0 1 4 14.1C4 10.6 7.2 7.2 12 2zm-1.2 16.4h2.4L14 22h-4z",
};

export function SuitIcon({
  suit,
  className,
}: {
  suit: Card["suit"];
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={SUIT_GLYPH[suit]} fill="currentColor" />
    </svg>
  );
}

export function PlayingCard({
  card,
  selected = false,
  disabled = false,
  faceDown = false,
  eligible = false,
  compact = false,
  label,
  className,
  onSelect,
}: {
  card?: Card;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  eligible?: boolean;
  compact?: boolean;
  label?: string;
  className?: string;
  onSelect?: () => void;
}) {
  const red = card?.color === "red";
  const accessibleLabel = label ?? (card ? `${card.rank} of ${card.suit}` : "Face-down card");

  return (
    <button
      type="button"
      disabled={disabled || !onSelect}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={accessibleLabel}
      className={cn(
        "card-shadow focus-ring relative shrink-0 rounded-[14px] border text-left transition-transform",
        compact ? "h-16 w-11" : "h-24 w-[4.25rem]",
        className,
        faceDown
          ? "border-white/70 bg-[linear-gradient(145deg,#ff4d6d,#7a5cff_45%,#3ee0ff)]"
          : "border-white bg-[#fffdf8]",
        selected && "-translate-y-4 ring-4 ring-[var(--gold)]",
        eligible && "ring-4 ring-[var(--lime)]",
        onSelect && !disabled && "hover:-translate-y-2 hover:rotate-1",
        disabled && "opacity-70",
      )}
    >
      {faceDown || !card ? (
        <div className="absolute inset-[6px] rounded-[10px] border-2 border-white/70 bg-[repeating-linear-gradient(45deg,#ffe14a_0_7px,#ff4fd8_7px_14px,#3ee0ff_14px_21px)]" />
      ) : (
        <div
          className={cn(
            "flex h-full flex-col justify-between p-1.5 font-display",
            red ? "text-[#e4234b]" : "text-[#243044]",
          )}
        >
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold sm:text-base">{card.rank}</span>
            <SuitIcon suit={card.suit} className="h-3.5 w-3.5" />
          </div>
          <SuitIcon suit={card.suit} className="mx-auto h-7 w-7 opacity-90 sm:h-8 sm:w-8" />
          <div className="flex rotate-180 flex-col leading-none">
            <span className="text-sm font-bold sm:text-base">{card.rank}</span>
            <SuitIcon suit={card.suit} className="h-3.5 w-3.5" />
          </div>
        </div>
      )}
    </button>
  );
}

export function CardBack({ compact = false }: { compact?: boolean }) {
  return <PlayingCard faceDown compact={compact} />;
}
