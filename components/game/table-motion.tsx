"use client";

import { PlayingCard } from "@/components/cards/playing-card";
import type { TableCue } from "@/lib/game/table-cues";
import { cn } from "@/lib/utils/cn";

export function TableMotion({
  cues,
  seatOffset,
  showCall = true,
}: {
  cues: TableCue[];
  seatOffset: (playerId: string) => { x: number; y: number };
  showCall?: boolean;
}) {
  const moving = cues.filter(
    (cue) => cue.kind === "discard" || cue.kind === "draw" || cue.kind === "pickup",
  );
  const caramba = cues.find((cue) => cue.kind === "caramba");

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {moving.map((cue) => {
        const actorId = "actorId" in cue ? cue.actorId : "";
        const offset = seatOffset(actorId);
        const towardSeat = cue.kind !== "discard";
        const cards =
          cue.kind === "discard"
            ? cue.cards
            : cue.kind === "draw"
              ? cue.hidden || !cue.card
                ? [null]
                : [cue.card]
              : cue.card
                ? [cue.card]
                : [];
        return cards.map((card, index) => (
          <div
            key={`${cue.id}-${card?.id ?? "back"}-${index}`}
            className={cn(
              "absolute left-1/2 top-1/2",
              towardSeat ? "fly-to-seat" : "fly-to-center",
            )}
            style={{
              ["--from-x" as string]: `${offset.x + index * 18}px`,
              ["--from-y" as string]: `${offset.y}px`,
              ["--spin" as string]: `${(index - (cards.length - 1) / 2) * 8}deg`,
            }}
          >
            <PlayingCard card={card ?? undefined} faceDown={!card} compact />
          </div>
        ));
      })}
      {showCall && caramba && (
        <p className="turn-chip absolute left-1/2 top-[18%] -translate-x-1/2 font-display text-4xl text-gold">
          CARRAMBA
        </p>
      )}
    </div>
  );
}
