"use client";

import { useLayoutEffect, useRef } from "react";
import type { PublicGameState } from "@/lib/game/types";
import { deriveStandings, placeLabel, type Standing } from "@/lib/ui/standings";
import { cn } from "@/lib/utils/cn";
import { AnimatedScore } from "@/components/scoreboard/animated-score";
import { Medal } from "@/components/scoreboard/medal";

export function Scoreboard({
  game,
  className,
  deferScores = false,
}: {
  game: PublicGameState;
  className?: string;
  deferScores?: boolean;
}) {
  const rows = deriveStandings(
    game.players.map((player) => {
      const line = deferScores
        ? game.roundResult?.lines.find((entry) => entry.playerId === player.id)
        : undefined;
      return {
        id: player.id,
        nickname: player.nickname,
        seatIndex: player.seatIndex,
        score: line?.previousTotal ?? player.score,
        roundScore: line ? null : player.lastRoundScore,
        eliminated: line ? player.eliminated && !line.eliminatedThisRound : player.eliminated,
      };
    }),
    deferScores ? null : game.winnerId,
  );
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());
  const orderKey = rows.map((row) => row.playerId).join("|");

  useLayoutEffect(() => {
    const reduced = document.documentElement.classList.contains("reduce-motion");
    const next = new Map<string, number>();
    for (const [id, element] of itemRefs.current) {
      const top = element.getBoundingClientRect().top;
      const previous = tops.current.get(id);
      if (previous !== undefined && !reduced && Math.abs(previous - top) > 1) {
        element.animate(
          [{ transform: `translateY(${previous - top}px)` }, { transform: "translateY(0)" }],
          { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }
      next.set(id, top);
    }
    tops.current = next;
  }, [orderKey]);

  return (
    <section
      className={cn(
        "rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4",
        className,
      )}
      aria-label="Scoreboard"
    >
      <h2 className="font-display text-xl">Scoreboard</h2>
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gold">
        Round {game.roundNumber || "-"} · out above {game.maxScore} · exact {game.maxScore} returns to {game.resetScore}
      </p>
      <p className="sr-only" aria-live="polite">
        {rows
          .map(
            (row) =>
              `${placeLabel(row.rank)}${row.tied ? ", tied" : ""}: ${row.nickname}, ${row.score} points.`,
          )
          .join(" ")}
      </p>
      <div className="mb-1 grid grid-cols-[1.75rem_minmax(0,1fr)_2.4rem_2.6rem] gap-2 px-2 text-[10px] uppercase tracking-[0.14em] text-cream/45">
        <span />
        <span>Player</span>
        <span className="text-right">Round</span>
        <span className="text-right">Total</span>
      </div>
      <ol className="space-y-1">
        {rows.map((row) => {
          const local = row.playerId === game.me?.id;
          const leader = row.rank === 1 && row.status !== "ELIMINATED";
          const hitHundred =
            !deferScores &&
            game.roundResult?.lines.find((line) => line.playerId === row.playerId)?.hitExactHundred;
          return (
            <li
              key={row.playerId}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(row.playerId, node);
                } else {
                  itemRefs.current.delete(row.playerId);
                }
              }}
              className={cn(
                "grid grid-cols-[1.75rem_minmax(0,1fr)_2.4rem_2.6rem] items-center gap-2 rounded-2xl px-2 py-1.5",
                local && "bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]/80",
                leader && "border border-[var(--gold)]/50",
                row.eliminated && "opacity-55",
              )}
            >
              <Medal place={row.medal} rank={row.rank} muted={row.eliminated} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {row.nickname}
                  {game.format === "teams" &&
                  game.players.find((player) => player.id === row.playerId)?.teamId
                    ? ` · Team ${game.players.find((player) => player.id === row.playerId)?.teamId}`
                    : ""}
                  {local ? <span className="sr-only">, you</span> : null}
                </span>
                <StandingNote row={row} leader={leader} />
              </span>
              <span className="text-right text-sm tabular-nums text-cream/80">
                {row.roundScore ?? "—"}
              </span>
              <span
                className={cn(
                  "text-right text-sm font-semibold",
                  hitHundred && "text-gold",
                )}
              >
                {hitHundred ? (
                  <span>
                    {game.resetScore}
                    <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wide">
                      {game.maxScore} → {game.resetScore}
                    </span>
                  </span>
                ) : (
                  <AnimatedScore value={row.score} />
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StandingNote({ row, leader }: { row: Standing; leader: boolean }) {
  const note =
    row.status === "WINNER"
      ? "Winner"
      : row.status === "ELIMINATED"
        ? "Eliminated"
        : leader
          ? "Leader"
          : "Playing";
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-wide",
        row.status === "ELIMINATED" ? "text-[var(--danger)]" : "text-gold/80",
      )}
    >
      {note}
    </span>
  );
}
