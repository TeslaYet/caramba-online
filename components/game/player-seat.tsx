"use client";

import type { PublicPlayerView } from "@/lib/game/types";
import { cn } from "@/lib/utils/cn";

const SEAT_COLORS = [
  "bg-[#ff4d6d]",
  "bg-[#3ee0ff]",
  "bg-[#ffe14a] text-ink",
  "bg-[#3dff9a] text-ink",
  "bg-[#ff4fd8]",
  "bg-[#7a5cff]",
  "bg-[#ff8a3d]",
  "bg-[#b6ff4a] text-ink",
];

export function PlayerSeat({
  player,
  isSelf = false,
}: {
  player: PublicPlayerView;
  isSelf?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-[92px] rounded-xl border-2 px-2 py-1 text-center backdrop-blur",
        player.isCurrent
          ? "animate-[pulse-turn_1.6s_ease-in-out_infinite] border-[var(--gold)] bg-[#ffe14a]/20"
          : "border-white/25 bg-[#2a1460]/70",
        player.eliminated && "opacity-50 grayscale",
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
      <p className="text-xs text-cream/60">
        {isSelf ? "You" : `${player.cardCount} cards`} · {player.score} pts
      </p>
      {player.eliminated && (
        <p className="text-[10px] uppercase tracking-wider text-[var(--danger)]">
          Eliminated
        </p>
      )}
    </div>
  );
}
