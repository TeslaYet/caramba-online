"use client";

import { cn } from "@/lib/utils/cn";
import type { Card } from "@/lib/game/types";

export function SuitIcon({
  suit,
  className,
}: {
  suit: Card["suit"];
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {suit === "hearts" && (
        <path
          fill="currentColor"
          d="M12 21C11 21 3.2 15.2 3.2 9.5 3.2 6.3 5.6 4.2 8.5 4.2c1.7 0 3 0.9 3.5 2.3C12.5 5.1 13.8 4.2 15.5 4.2c2.9 0 5.3 2.1 5.3 5.3C20.8 15.2 13 21 12 21z"
        />
      )}
      {suit === "diamonds" && (
        <path fill="currentColor" d="M12 2.2 21.2 12 12 21.8 2.8 12z" />
      )}
      {suit === "clubs" && (
        <>
          <circle cx="12" cy="6.5" r="3.7" fill="currentColor" />
          <circle cx="7.9" cy="11.7" r="3.7" fill="currentColor" />
          <circle cx="16.1" cy="11.7" r="3.7" fill="currentColor" />
          <circle cx="12" cy="11.4" r="2.2" fill="currentColor" />
          <path fill="currentColor" d="M10.6 14.1h2.8l.8 7.4h-4.4z" />
        </>
      )}
      {suit === "spades" && (
        <path
          fill="currentColor"
          d="M12 2.1C12 2.1 3.6 9.4 3.6 14.4 3.6 17.6 6.1 19.6 9.2 19.6c1.2 0 2.2-.5 2.8-1.3.6.8 1.6 1.3 2.8 1.3 3.1 0 5.6-2 5.6-5.2C20.4 9.4 12 2.1 12 2.1zM10.5 17.4l-.8 4.4h4.6l-.8-4.4z"
        />
      )}
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
  mini = false,
  decorative = false,
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
  mini?: boolean;
  decorative?: boolean;
  label?: string;
  className?: string;
  onSelect?: () => void;
}) {
  const red = card?.color === "red";
  const accessibleLabel = label ?? (card ? `${card.rank} of ${card.suit}` : "Face-down card");
  const classes = cn(
    mini ? "card-shadow-mini rounded-[10px]" : "card-shadow rounded-[14px]",
    "focus-ring relative shrink-0 touch-manipulation overflow-hidden border text-left transition-transform",
    mini ? "h-12 w-8" : compact ? "h-20 w-14 sm:h-16 sm:w-11" : "h-24 w-[4.25rem]",
    className,
    faceDown || !card
      ? "border-white/70 bg-[linear-gradient(145deg,var(--serape),#f08a2a_45%,var(--accent))]"
      : "border-white bg-[#fffdf8]",
    selected && "-translate-y-4 ring-4 ring-[var(--gold)]",
    eligible && "ring-4 ring-[var(--lime)]",
    onSelect && !disabled && "card-hover",
    disabled && !decorative && "opacity-70",
  );
  const face =
    faceDown || !card ? (
      <div
        className={cn(
          "absolute border-white/70 bg-[repeating-linear-gradient(45deg,#ffc533_0_7px,#e23b2f_7px_14px,#2f9e4a_14px_21px)]",
          mini ? "inset-[3px] rounded-[6px] border" : "inset-[6px] rounded-[10px] border-2",
        )}
      />
    ) : (
      <div className={cn("relative h-full w-full", red ? "text-[#e4234b]" : "text-[#243044]")}>
        <CornerIndex card={card} compact={compact || mini} />
        <SuitIcon
          suit={card.suit}
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            mini ? "h-3 w-3" : compact ? "h-4 w-4" : "h-7 w-7",
          )}
        />
        <CornerIndex card={card} compact={compact || mini} mirrored />
      </div>
    );

  if (decorative) {
    return (
      <div aria-hidden className={classes}>
        {face}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || !onSelect}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={accessibleLabel}
      className={classes}
    >
      {face}
    </button>
  );
}

function CornerIndex({
  card,
  compact,
  mirrored = false,
}: {
  card: Card;
  compact: boolean;
  mirrored?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute flex flex-col items-center leading-none",
        mirrored ? "bottom-[2px] right-[2px] rotate-180" : "left-[2px] top-[2px]",
      )}
    >
      <span
        className={cn(
          "font-sans font-extrabold tabular-nums leading-none",
          compact ? "text-[10px]" : "text-[15px]",
          card.rank === "10" && (compact ? "text-[9px]" : "text-[13px]"),
        )}
      >
        {card.rank}
      </span>
      <SuitIcon suit={card.suit} className={compact ? "h-2 w-2" : "mt-px h-3 w-3"} />
    </div>
  );
}

export function CardBack({ compact = false }: { compact?: boolean }) {
  return <PlayingCard faceDown compact={compact} />;
}
