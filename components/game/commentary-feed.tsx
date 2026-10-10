"use client";

import { useEffect, useState } from "react";
import { PlayingCard } from "@/components/cards/playing-card";
import { commentaryForFeed, type CommentaryLine } from "@/lib/game/commentary";
import type { GameLogEvent } from "@/lib/game/types";
import { cn } from "@/lib/utils/cn";

const DESKTOP_PREVIEW = 3;

export function CommentaryFeed({
  events,
  players,
  showResults,
}: {
  events: GameLogEvent[];
  players: Array<{ id: string; nickname: string }>;
  showResults: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lines = commentaryForFeed(events, players).filter(
    (entry) => showResults || (entry.key !== "caramba_success" && entry.key !== "caramba_failed"),
  );
  const newestFirst = [...lines].reverse();
  const hasMobileHistory = newestFirst.length > 1;
  const hasDesktopHistory = newestFirst.length > DESKTOP_PREVIEW;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (newestFirst.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Game commentary"
      data-testid="commentary"
      data-open={open ? "true" : "false"}
      className="commentary-dock z-20 w-full shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 lg:absolute lg:bottom-2 lg:left-2 lg:w-[min(16.5rem,32%)]"
    >
      <p className="commentary-kicker text-[10px] font-bold uppercase tracking-[0.18em] text-gold/80">
        <span className="lg:hidden">Recent action</span>
        <span className="hidden lg:inline">Recent actions</span>
      </p>
      <p className="sr-only" aria-live="polite">
        {newestFirst[0]?.text}
      </p>
      <ol className={cn("mt-1", open && "max-h-36 overflow-y-auto overscroll-contain")}>
        {newestFirst.map((entry, index) => (
          <CommentaryRow
            key={entry.id}
            entry={entry}
            fresh={index === 0 && !open}
            className={rowVisibility(index, open)}
          />
        ))}
      </ol>
      {(hasMobileHistory || hasDesktopHistory) && (
        <button
          type="button"
          className={cn(
            "commentary-history mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gold",
            !hasMobileHistory && "max-lg:hidden",
            !hasDesktopHistory && "lg:hidden",
          )}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Close history" : "View history"}
        </button>
      )}
    </section>
  );
}

function rowVisibility(index: number, open: boolean): string {
  if (open || index === 0) {
    return "";
  }
  if (index < DESKTOP_PREVIEW) {
    return "max-lg:hidden";
  }
  return "hidden";
}

function CommentaryRow({
  entry,
  fresh,
  className,
}: {
  entry: CommentaryLine;
  fresh: boolean;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-1.5 border-t border-white/10 py-1 text-xs leading-snug first:border-t-0",
        fresh && "commentary-in",
        entry.priority === "critical" && "font-bold text-gold",
        entry.key === "player_eliminated" && "border-l-2 border-[var(--serape)] pl-1.5 text-cream",
        entry.priority === "high" && entry.key !== "player_eliminated" && "text-gold",
        entry.priority === "normal" && "text-cream/90",
        entry.priority === "low" && "text-cream/70",
        className,
      )}
    >
      <span className="min-w-0">{entry.text}</span>
      {entry.cards.length > 0 && (
        <span className="flex shrink-0 gap-0.5">
          {entry.cards.map((card) => (
            <PlayingCard key={card.id} card={card} mini decorative className="h-6 w-4" />
          ))}
        </span>
      )}
    </li>
  );
}
