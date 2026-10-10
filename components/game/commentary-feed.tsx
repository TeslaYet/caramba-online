"use client";

import { useState } from "react";
import { PlayingCard } from "@/components/cards/playing-card";
import { commentaryFromEvents, type CommentaryLine } from "@/lib/game/commentary";
import type { GameLogEvent } from "@/lib/game/types";
import { cn } from "@/lib/utils/cn";

export function CommentaryFeed({
  events,
  players,
  showResults,
  compact,
}: {
  events: GameLogEvent[];
  players: Array<{ id: string; nickname: string }>;
  showResults: boolean;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lines = commentaryFromEvents(events, players).filter(
    (entry) => showResults || (entry.key !== "caramba_success" && entry.key !== "caramba_failed"),
  );
  const limit = open ? 8 : compact ? 3 : 5;
  const visible = lines.slice(-limit);
  if (visible.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Game commentary"
      data-testid="commentary"
      className="pointer-events-auto w-full max-w-sm"
    >
      <ol aria-live="polite" className="flex flex-col gap-1">
        {visible.map((entry) => (
          <CommentaryRow key={entry.id} entry={entry} />
        ))}
      </ol>
      {lines.length > (compact ? 3 : 5) && (
        <button
          type="button"
          className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gold"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Less" : "Recent plays"}
        </button>
      )}
    </section>
  );
}

function CommentaryRow({ entry }: { entry: CommentaryLine }) {
  return (
    <li
      className={cn(
        "commentary-in flex flex-wrap items-center gap-1.5 rounded-xl bg-black/55 px-2 py-1 text-xs leading-snug text-cream",
        entry.priority === "high" && "text-gold",
        entry.priority === "critical" && "font-extrabold text-[var(--serape)]",
        entry.priority === "low" && "text-cream/75",
      )}
    >
      <span>{entry.text}</span>
      {entry.cards.length > 0 && (
        <span className="flex shrink-0 gap-0.5">
          {entry.cards.map((card) => (
            <PlayingCard key={card.id} card={card} mini decorative className="h-7 w-5" />
          ))}
        </span>
      )}
    </li>
  );
}
