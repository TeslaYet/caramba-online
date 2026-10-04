"use client";

import { ranking } from "@/lib/game/turn-manager";
import type { PublicGameState } from "@/lib/game/types";
import { cn } from "@/lib/utils/cn";

export function Scoreboard({
  game,
  className,
}: {
  game: PublicGameState;
  className?: string;
}) {
  const rows = ranking(
    game.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      seatIndex: player.seatIndex,
      hand: player.hand ?? [],
      totalScore: player.score,
      lastRoundScore: player.lastRoundScore,
      eliminated: player.eliminated,
      connected: player.connected,
      ready: player.ready,
    })),
  );

  return (
    <section
      className={cn(
        "rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4",
        className,
      )}
    >
      <h2 className="font-display text-xl">Scoreboard</h2>
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gold">
        Round {game.roundNumber || "-"}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-cream/50">
            <tr>
              <th className="pb-2 font-medium">Player</th>
              <th className="pb-2 text-right font-medium">Round</th>
              <th className="pb-2 text-right font-medium">Total</th>
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => {
              const status =
                game.winnerId === player.id
                  ? "WINNER"
                  : player.eliminated
                    ? "ELIMINATED"
                    : "PLAYING";
              const hitHundred = game.roundResult?.lines.find(
                (line) => line.playerId === player.id,
              )?.hitExactHundred;
              return (
                <tr key={player.id} className="border-t border-white/5">
                  <td className="py-2">{player.nickname}</td>
                  <td className="py-2 text-right">{player.lastRoundScore ?? "—"}</td>
                  <td
                    className={cn(
                      "py-2 text-right font-semibold",
                      hitHundred && "animate-[score-flash_700ms_ease]",
                    )}
                  >
                    {hitHundred ? "100 → 50" : player.totalScore}
                  </td>
                  <td
                    className={cn(
                      "py-2 text-right text-xs uppercase tracking-wide",
                      status === "WINNER" && "text-gold",
                      status === "ELIMINATED" && "text-[var(--danger)]",
                    )}
                  >
                    {status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
