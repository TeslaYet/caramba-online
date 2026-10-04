"use client";

import { PlayingCard } from "@/components/cards/playing-card";
import { Button } from "@/components/ui/button";
import { GAME_RULES } from "@/lib/game/rules";
import { ranking } from "@/lib/game/turn-manager";
import type { PublicGameState } from "@/lib/game/types";

export function RoundEndOverlay({
  game,
  secondsLeft,
  onNext,
}: {
  game: PublicGameState;
  secondsLeft: number;
  onNext: () => void;
}) {
  const result = game.roundResult;
  if (!result) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--line)] pop-panel p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Caramba!</p>
        <h2 className="font-display text-4xl">
          {result.callerNickname} called Caramba.
        </h2>
        <p className="mt-2 text-cream/80">
          {result.success
            ? "CARAMBA SUCCESS. The caller scores 0."
            : result.reason === "TIED_LOWEST"
              ? "CARAMBA FAILED. Another player had the same hand value."
              : "CARAMBA FAILED. Another player had a lower hand."}
        </p>
        <div className="mt-5 space-y-3">
          {result.lines.map((line) => (
            <div key={line.playerId} className="rounded-2xl bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <strong>{line.nickname}</strong>
                <span>
                  {line.handValue}
                  {line.playerId === result.callerId && !result.success
                    ? ` + 30 = ${line.roundScore}`
                    : ` → ${line.roundScore}`}
                  {line.hitExactHundred ? " · 100 → 50" : ""}
                  {line.eliminatedThisRound ? " · Eliminated" : ""}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {line.hand.map((card) => (
                  <PlayingCard key={card.id} card={card} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-cream/70">Next round in {secondsLeft}s</p>
          <Button onClick={onNext} data-testid="next-round">
            Next Round
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GameOverOverlay({
  game,
  isHost,
  onRematch,
  onLobby,
  onLeave,
}: {
  game: PublicGameState;
  isHost: boolean;
  onRematch: () => void;
  onLobby: () => void;
  onLeave: () => void;
}) {
  const winner = game.players.find((player) => player.id === game.winnerId);
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-[var(--line)] pop-panel p-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Game over</p>
        <h2 className="font-display text-5xl">{winner?.nickname ?? "A player"} wins</h2>
        <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left">
          {rows.map((player, index) => (
            <li key={player.id} className="flex justify-between rounded-xl bg-black/20 px-3 py-2">
              <span>
                {index + 1}. {player.nickname}
              </span>
              <span>{player.totalScore}</span>
            </li>
          ))}
        </ol>
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
      </div>
    </div>
  );
}

export function CarambaConfirm({
  handValue,
  onCancel,
  onConfirm,
}: {
  handValue: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--line)] pop-panel p-6">
        <h2 className="font-display text-3xl">Call CARAMBA?</h2>
        <p className="mt-2 text-cream/80">
          Your current hand: <strong>{handValue} points</strong>
        </p>
        <p className="mt-2 text-sm text-cream/70">
          You are declaring that you have the strictly lowest hand. A wrong call
          costs your hand value + 30. You can only call with {GAME_RULES.CARAMBA_MAX_HAND} or
          less.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="gold" onClick={onConfirm} data-testid="confirm-caramba">
            CARAMBA
          </Button>
        </div>
      </div>
    </div>
  );
}
