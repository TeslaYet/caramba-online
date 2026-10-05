"use client";

import { Button } from "@/components/ui/button";
import { GAME_RULES } from "@/lib/game/rules";
import type { DiscardValidation, PublicGameState } from "@/lib/game/types";
import { describeDiscard } from "@/lib/game/validators";

export function ActionBar({
  game,
  validation,
  selectedCount,
  remainingValue,
  canTake,
  onPlay,
  onDraw,
  onTake,
  onCaramba,
}: {
  game: PublicGameState;
  validation: DiscardValidation;
  selectedCount: number;
  remainingValue: number | null;
  canTake: boolean;
  onPlay: () => void;
  onDraw: () => void;
  onTake: () => void;
  onCaramba: () => void;
}) {
  const mine = game.me?.isCurrent && game.status === "PLAYING";
  const discardPhase = mine && game.turnPhase === "DISCARD";
  const drawPhase = mine && game.turnPhase === "DRAW";
  const handValue = game.me?.handValue ?? 0;
  const canCallCaramba = discardPhase && handValue <= GAME_RULES.CARAMBA_MAX_HAND;

  return (
    <section className="shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-lg leading-none">
            Your hand: {handValue}
          </p>
          <p className="text-sm text-cream/70">
            {selectedCount === 0
              ? "Select a legal combination to play."
              : validation.valid
                ? `Selected: ${selectedCount} cards · ${describeDiscard(validation)}`
                : describeDiscard(validation)}
          </p>
          {remainingValue !== null && selectedCount > 0 && (
            <p className="text-xs text-gold">Remaining after discard: {remainingValue}</p>
          )}
          {discardPhase && !canCallCaramba && (
            <p className="text-xs text-cream/70">
              Carramba needs {GAME_RULES.CARAMBA_MAX_HAND} or less.
            </p>
          )}
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-gold">
          {game.me?.isCurrent
            ? game.turnPhase === "DRAW"
              ? "Draw one card"
              : "Your turn"
            : `${game.players.find((player) => player.id === game.currentPlayerId)?.nickname ?? "Someone"}'s turn`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button
          onClick={onPlay}
          disabled={!discardPhase || !validation.valid}
          data-testid="play-button"
        >
          Play
        </Button>
        <Button
          variant="secondary"
          onClick={onDraw}
          disabled={!drawPhase}
          data-testid="draw-button"
        >
          Draw from Deck
        </Button>
        <Button
          variant="secondary"
          onClick={onTake}
          disabled={!drawPhase || !canTake}
          data-testid="take-button"
        >
          Take Discard
        </Button>
        <Button
          variant="gold"
          onClick={onCaramba}
          disabled={!canCallCaramba}
          data-testid="caramba-button"
        >
          CARRAMBA
        </Button>
      </div>
    </section>
  );
}
