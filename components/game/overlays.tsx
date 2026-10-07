"use client";

import { PlayingCard } from "@/components/cards/playing-card";
import { Button } from "@/components/ui/button";
import { GAME_RULES } from "@/lib/game/rules";
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
  const lowest = Math.min(...result.lines.map((line) => line.handValue));

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-4">
      <div className="turn-chip max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--gold)] pop-panel p-6">
        <p className="font-display text-5xl text-gold">CARRAMBA</p>
        <h2 className="mt-1 font-display text-3xl">
          {result.callerNickname} called Carramba.
        </h2>
        <p className="mt-2 text-cream/80">
          {result.success
            ? "CARRAMBA SUCCESS. The caller scores 0."
            : result.reason === "TIED_LOWEST"
              ? "CARRAMBA FAILED. Another player had the same hand value."
              : "CARRAMBA FAILED. Another player had a lower hand."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {result.lines.map((line) => {
            const isLowest = line.handValue === lowest;
            return (
              <div
                key={line.playerId}
                className={`rounded-2xl px-2 py-2 text-center ${isLowest ? "bg-[var(--gold)]/20 ring-2 ring-[var(--gold)]" : "bg-black/25"}`}
              >
                <p className="truncate text-xs font-semibold">{line.nickname}</p>
                <p className="font-display text-3xl leading-none">{line.handValue}</p>
                <p className="text-[10px] uppercase tracking-wide text-gold">
                  {isLowest ? "Lowest" : "Hand"}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 space-y-3">
          {result.lines.map((line, index) => (
            <div
              key={line.playerId}
              className="card-deal rounded-2xl bg-black/20 p-3"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{line.nickname}</strong>
                <span className={line.eliminatedThisRound ? "font-extrabold text-[var(--danger)]" : "text-gold"}>
                  {line.handValue}
                  {line.playerId === result.callerId && !result.success
                    ? ` + 30 = ${line.roundScore}`
                    : ` → ${line.roundScore}`}
                  {line.hitExactHundred ? ` · ${game.maxScore} → ${game.resetScore}` : ""}
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-cream/70">Next round in {secondsLeft}s</p>
          <Button onClick={onNext} data-testid="next-round">
            Next Round
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
        <h2 className="font-display text-3xl">Call CARRAMBA?</h2>
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
            CARRAMBA
          </Button>
        </div>
      </div>
    </div>
  );
}
