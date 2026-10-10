"use client";

import { useEffect, useState } from "react";
import type { PublicPlayerView } from "@/lib/game/types";
import { cn } from "@/lib/utils/cn";

const SEAT_COLORS = [
  "bg-[var(--serape)]",
  "bg-[var(--gold)] text-ink",
  "bg-[var(--accent)]",
  "bg-[#f08a2a]",
  "bg-[#f4d7a1] text-ink",
  "bg-[#8c2f1b]",
  "bg-[#ffd56a] text-ink",
  "bg-[#1f7a45]",
];

export function PlayerSeat({
  player,
  isSelf = false,
  notice,
  compact = false,
}: {
  player: PublicPlayerView;
  isSelf?: boolean;
  notice?: string | null;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex w-[7.25rem] shrink-0 items-center gap-1.5 rounded-full border-2 px-2 py-1",
          player.isCurrent ? "border-[var(--gold)] bg-[var(--gold)]/25" : "border-white/20 bg-[var(--panel)]",
          player.eliminated && "opacity-60 grayscale",
        )}
      >
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm text-white",
            SEAT_COLORS[player.seatIndex % SEAT_COLORS.length],
          )}
        >
          {player.nickname.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 text-left">
          <p className="truncate text-xs font-semibold">{player.nickname}</p>
          <p className="text-[10px] text-cream/70">
            <LiveCount count={player.cardCount} compact />
            {" · "}
            <LiveScore score={player.score} />
          </p>
          {player.teamId && (
            <p className="text-[10px] font-bold uppercase text-gold">Team {player.teamId}</p>
          )}
          {player.isCurrent && <p className="text-[10px] font-bold uppercase text-gold">Turn</p>}
          {notice && <p className="text-[10px] uppercase text-gold">{notice}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-[92px] rounded-xl border-2 px-2 py-1 text-center backdrop-blur",
        player.isCurrent
          ? "border-[var(--gold)] bg-[var(--gold)]/25"
          : "border-white/25 bg-[var(--panel)]",
        player.eliminated && "opacity-60 grayscale",
      )}
    >
      <div
        className={cn(
          "mx-auto mb-0.5 flex h-7 w-7 items-center justify-center rounded-full font-display text-sm text-white",
          SEAT_COLORS[player.seatIndex % SEAT_COLORS.length],
        )}
      >
        {player.nickname.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex items-center justify-center gap-1 text-sm font-semibold">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            player.connected ? "bg-[var(--ok)]" : "bg-cream/30",
          )}
          aria-hidden
        />
        {player.nickname}
      </div>
      <LiveCount count={player.cardCount} />
      <p className="text-xs text-cream/60">
        {isSelf ? "You · " : null}
        <LiveScore score={player.score} />
      </p>
      {player.teamId && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Team {player.teamId}</p>
      )}
      {player.isCurrent && !player.eliminated && (
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-gold">Turn</p>
      )}
      {notice && <p className="text-[10px] uppercase tracking-wider text-gold">{notice}</p>}
      {player.eliminated && (
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--danger)]">
          Eliminated
        </p>
      )}
    </div>
  );
}

function LiveCount({ count, compact = false }: { count: number; compact?: boolean }) {
  const [shown, setShown] = useState(count);
  const [delta, setDelta] = useState<number | null>(null);
  if (count !== shown) {
    setDelta(count - shown);
    setShown(count);
  }

  useEffect(() => {
    if (delta === null) {
      return;
    }
    const timer = window.setTimeout(() => setDelta(null), 700);
    return () => window.clearTimeout(timer);
  }, [delta]);

  const change = delta === null ? "" : delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <span className={cn(!compact && "mt-0.5 block text-cream")} aria-label={`${count} cards`}>
      <span
        className={cn(
          "font-display tabular-nums leading-none",
          compact ? "text-sm" : "text-lg",
          delta !== null && "count-pop",
        )}
      >
        {count}
      </span>
      {!compact && <span className="ml-1 text-[10px] uppercase tracking-wide text-cream/70">cards</span>}
      {change && <span className="ml-1 text-[10px] text-gold">{change}</span>}
    </span>
  );
}

function LiveScore({ score }: { score: number }) {
  const [shown, setShown] = useState(score);
  const [pulse, setPulse] = useState(false);
  if (score !== shown) {
    setShown(score);
    setPulse(true);
  }

  useEffect(() => {
    if (!pulse) {
      return;
    }
    const timer = window.setTimeout(() => setPulse(false), 420);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  return (
    <span className={cn("tabular-nums", pulse && "inline-block count-pop")}>{score} pts</span>
  );
}
