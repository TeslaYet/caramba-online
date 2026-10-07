"use client";

import { useAdaptiveDevice } from "@/components/providers/adaptive-device";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { GAME_RULES } from "@/lib/game/rules";
import type { DiscardValidation, PublicGameState } from "@/lib/game/types";
import { describeDiscard } from "@/lib/game/validators";

export function ActionBar({
  game,
  validation,
  selectedCount,
  remainingValue,
  onPlay,
  onDraw,
  onTake,
  onCaramba,
}: {
  game: PublicGameState;
  validation: DiscardValidation;
  selectedCount: number;
  remainingValue: number | null;
  onPlay: () => void;
  onDraw: () => void;
  onTake: () => void;
  onCaramba: () => void;
}) {
  const mine = game.me?.isCurrent && game.status === "PLAYING";
  const discardPhase = mine && game.turnPhase === "DISCARD";
  const drawPhase = mine && game.turnPhase === "DRAW";
  const handValue = game.me?.handValue ?? 0;
  const canTakeDiscard = drawPhase && Boolean(game.eligibleDiscardGroupId);
  const canCallCaramba = discardPhase && handValue <= GAME_RULES.CARAMBA_MAX_HAND;
  const { hasHover } = useAdaptiveDevice();
  const verb = hasHover ? "Click" : "Tap";

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
          {drawPhase && (
            <p className="text-xs text-cream/70">
              {verb} a discard card twice, or press Take Discard.
            </p>
          )}
          {discardPhase && !canCallCaramba && (
            <p className="text-xs text-cream/70">
              Carramba needs {GAME_RULES.CARAMBA_MAX_HAND} or less.
            </p>
          )}
        </div>
        <p className="hidden text-sm uppercase tracking-[0.2em] text-gold sm:block">
          {game.me?.isCurrent
            ? game.turnPhase === "DRAW"
              ? "Draw one card"
              : "Your turn"
            : `${game.players.find((player) => player.id === game.currentPlayerId)?.nickname ?? "Someone"}'s turn`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button
          className={cn("max-sm:min-h-11", (!discardPhase || !validation.valid) && "max-sm:hidden")}
          onClick={onPlay}
          disabled={!discardPhase || !validation.valid}
          data-testid="play-button"
        >
          {selectedCount > 0 ? `Play ${selectedCount}` : "Play"}
        </Button>
        <Button
          className={cn("max-sm:min-h-11", !drawPhase && "max-sm:hidden")}
          variant="secondary"
          onClick={onDraw}
          disabled={!drawPhase}
          data-testid="draw-button"
        >
          Draw from Deck
        </Button>
        <Button
          className={cn("max-sm:min-h-11", !canTakeDiscard && "max-sm:hidden")}
          variant="secondary"
          onClick={onTake}
          disabled={!canTakeDiscard}
          data-testid="take-discard-button"
        >
          Take Discard
        </Button>
        <Button
          className={cn("max-sm:min-h-11", !canCallCaramba && "max-sm:hidden")}
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
