"use client";

import { BrandMark } from "@/components/brand/brand-mark";
import { PlayingCard } from "@/components/cards/playing-card";
import { AnimatedScore } from "@/components/scoreboard/animated-score";
import { Medal } from "@/components/scoreboard/medal";
import { Button } from "@/components/ui/button";
import type { PublicGameState } from "@/lib/game/types";
import { deriveStandings, placeLabel, type Standing } from "@/lib/ui/standings";
import type { WinnerPhase } from "@/lib/ui/winner-celebration";
import { cn } from "@/lib/utils/cn";

const FAN = [-32, -16, 0, 16, 32];
const SPARKS = [
  { dx: "-70px", dy: "-90px", color: "var(--gold)", delay: "80ms" },
  { dx: "80px", dy: "-70px", color: "var(--serape)", delay: "140ms" },
  { dx: "-40px", dy: "-120px", color: "#f4d7a1", delay: "40ms" },
  { dx: "50px", dy: "-110px", color: "var(--accent)", delay: "200ms" },
  { dx: "110px", dy: "-30px", color: "var(--gold)", delay: "120ms" },
  { dx: "-110px", dy: "-20px", color: "#f08a2a", delay: "180ms" },
];

export function WinnerCelebration({
  game,
  phase,
  reduceMotion,
  isHost,
  onRematch,
  onLobby,
  onLeave,
}: {
  game: PublicGameState;
  phase: WinnerPhase;
  reduceMotion: boolean;
  isHost: boolean;
  onRematch: () => void;
  onLobby: () => void;
  onLeave: () => void;
}) {
  const rows = deriveStandings(
    game.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      seatIndex: player.seatIndex,
      score: player.score,
      roundScore: player.lastRoundScore,
      eliminated: player.eliminated,
    })),
    game.winnerId,
  );
  const winner = rows.find((row) => row.playerId === game.winnerId) ?? rows[0];
  const teamGame = game.format === "teams";
  const winningTeam = game.winnerTeamId ?? null;
  const localWin = teamGame
    ? Boolean(winningTeam && game.me && game.players.find((player) => player.id === game.me?.id)?.teamId === winningTeam)
    : winner?.playerId === game.me?.id;
  const localDelta = game.ratingDeltas?.find((entry) => entry.playerId === game.me?.id) ?? null;
  const showName = reduceMotion || phase !== "logo";
  const showPodium = reduceMotion || phase === "podium" || phase === "settled";
  const showActions = showName;
  const top = rows.filter((row) => row.rank <= 3);
  const rest = rows.filter((row) => row.rank > 3);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#120a07]/95">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-8">
        <p className="sr-only">
          {localWin ? "You won. " : ""}
          {teamGame
            ? winningTeam
              ? `Team ${winningTeam} wins. `
              : "Both teams were eliminated. Draw. "
            : `Winner: ${winner?.nickname ?? "Unknown"}. `}
          Final ranking.{" "}
          {rows
            .map(
              (row) =>
                `${placeLabel(row.rank)}${row.tied ? ", tied" : ""}: ${row.nickname}, ${row.score} points.`,
            )
            .join(" ")}
        </p>

        {!reduceMotion && (phase === "logo" || phase === "name") && (
          <div className={cn("relative mb-4", phase === "logo" ? "winner-logo-play" : "winner-logo-rest")}>
            <div className="winner-fan-row" aria-hidden>
              {FAN.map((tilt) => (
                <div key={tilt} className="winner-fan" style={{ ["--tilt" as string]: `${tilt}deg` }}>
                  <PlayingCard faceDown decorative mini />
                </div>
              ))}
            </div>
            <BrandMark size="hero" className="relative mx-auto h-auto w-[min(68vw,16rem)] sm:w-[min(36vw,20rem)]" />
            <span className="winner-glow" aria-hidden />
            {phase === "logo" &&
              SPARKS.map((spark) => (
                <span
                  key={`${spark.dx}-${spark.dy}`}
                  className="winner-spark"
                  style={{
                    background: spark.color,
                    animationDelay: spark.delay,
                    ["--dx" as string]: spark.dx,
                    ["--dy" as string]: spark.dy,
                  }}
                />
              ))}
          </div>
        )}

        {showName && (winner || teamGame) && (
          <div className={cn("relative text-center", !reduceMotion && phase === "name" && "winner-name-in")}>
            <Crown />
            {!teamGame && winner && <Medal place={winner.medal} rank={winner.rank} />}
            <p className="mt-3 font-display text-4xl sm:text-6xl">
              {teamGame ? (winningTeam ? `Team ${winningTeam}` : "Draw") : localWin ? "You" : winner?.nickname}
            </p>
            {localWin && !teamGame ? (
              <p className="text-sm uppercase tracking-[0.2em] text-cream/70">{winner?.nickname}</p>
            ) : null}
            {teamGame && localWin ? (
              <p className="text-sm uppercase tracking-[0.2em] text-cream/70">Your team</p>
            ) : null}
            <p className="font-display text-2xl text-gold">{teamGame && !winningTeam ? "No winner" : "Winner"}</p>
            {!teamGame && winner && (
              <p className="mt-1 text-lg">
                <AnimatedScore value={winner.score} /> pts
              </p>
            )}
            {localDelta && (
              <p className="mt-2 text-sm text-gold" data-testid="rating-delta">
                Rating {localDelta.before} → {localDelta.after}{" "}
                {localDelta.delta > 0 ? `+${localDelta.delta}` : localDelta.delta}
              </p>
            )}
          </div>
        )}

        {showPodium && (
          <div className="mt-8 w-full">
            <h2 className="text-center text-xs uppercase tracking-[0.28em] text-gold">Final ranking</h2>
            <div className="mt-4 hidden items-end justify-center gap-3 sm:flex">
              <PodiumCard row={top.find((row) => row.rank === 2) ?? null} delay={120} />
              <PodiumCard row={top.find((row) => row.rank === 1) ?? null} delay={0} featured />
              <PodiumCard row={top.find((row) => row.rank === 3) ?? null} delay={220} />
            </div>
            <ol className="mx-auto mt-4 max-w-md space-y-2 sm:hidden">
              {rows.map((row, index) => (
                <li
                  key={row.playerId}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2",
                    row.playerId === game.me?.id && "ring-1 ring-[var(--gold)]/70",
                    !reduceMotion && "podium-row",
                  )}
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <Medal place={row.medal} rank={row.rank} muted={row.eliminated} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {row.nickname}
                      {row.playerId === game.me?.id ? <span className="sr-only">, you</span> : null}
                    </span>
                    {row.eliminated ? (
                      <span className="text-[10px] uppercase tracking-wide text-[var(--danger)]">
                        Eliminated
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">
                    <AnimatedScore value={row.score} />
                  </span>
                </li>
              ))}
            </ol>
            {rest.length > 0 && (
              <ol className="mx-auto mt-6 hidden max-w-md space-y-2 sm:block">
                {rest.map((row) => (
                  <li
                    key={row.playerId}
                    className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-2"
                  >
                    <span>
                      {row.rank}. {row.nickname}
                      {row.eliminated ? " · Eliminated" : ""}
                    </span>
                    <AnimatedScore value={row.score} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {showActions && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {isHost && (
              <>
                <Button onClick={onRematch} data-testid="rematch">
                  Rematch
                </Button>
                <Button variant="secondary" onClick={onLobby}>
                  Back to Lobby
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={onLeave}>
              Leave Room
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  row,
  delay,
  featured = false,
}: {
  row: Standing | null;
  delay: number;
  featured?: boolean;
}) {
  if (!row) {
    return <div className="w-36" />;
  }
  return (
    <div
      className={cn(
        "podium-row w-36 rounded-3xl border border-white/10 bg-black/30 px-3 py-4 text-center",
        featured && "mb-6 w-44 border-[var(--gold)] bg-[var(--gold)]/10",
        row.eliminated && "opacity-60",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Medal place={row.medal} rank={row.rank} muted={row.eliminated} />
      <p className="mt-2 truncate font-display text-2xl">{row.nickname}</p>
      <p className="text-sm text-cream/70">{row.eliminated ? "Eliminated" : featured ? "Winner" : "Final"}</p>
      <p className="font-display text-3xl">
        <AnimatedScore value={row.score} />
      </p>
    </div>
  );
}

function Crown() {
  return (
    <svg viewBox="0 0 64 36" className="mx-auto mb-2 h-8 w-14 text-gold" aria-hidden>
      <path
        fill="currentColor"
        d="M6 30 10 12l12 8 10-16 10 16 12-8 4 18H6z"
      />
      <rect x="8" y="30" width="48" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}
