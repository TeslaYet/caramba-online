"use client";

import { useEffect, useState } from "react";
import { PlayingCard } from "@/components/cards/playing-card";
import type { Card } from "@/lib/game/types";
import { fanStep } from "@/lib/ui/hidden-hand";
import { cn } from "@/lib/utils/cn";

type Toward = "up" | "down" | "left" | "right";

const LEAVE_MS = 360;

export function OpponentHand({
  playerId,
  nickname,
  count,
  cards = null,
  orientation,
  toward,
  active = false,
  eliminated = false,
  size = "table",
  readable = false,
  flip = false,
  revealDelay = 0,
}: {
  playerId: string;
  nickname: string;
  count: number;
  cards?: Card[] | null;
  orientation: "horizontal" | "vertical";
  toward: Toward;
  active?: boolean;
  eliminated?: boolean;
  size?: "table" | "strip";
  readable?: boolean;
  flip?: boolean;
  revealDelay?: number;
}) {
  const revealed = cards != null;
  const showdownSize = readable && size === "table";
  const stripRevealed = revealed && size === "strip";
  const width = size === "strip" ? (stripRevealed ? 32 : 24) : showdownSize ? 44 : 32;
  const height = size === "strip" ? (stripRevealed ? 48 : 32) : showdownSize ? 64 : 48;
  const maxSpan = size === "strip" ? (stripRevealed ? 168 : 92) : showdownSize ? 220 : orientation === "vertical" ? 100 : 116;
  const frameClass = cn(
    "pointer-events-none relative",
    active && "hand-live",
    eliminated && "opacity-45 grayscale",
  );

  if (revealed) {
    if (cards.length === 0) {
      return null;
    }
    return (
      <div role="img" aria-label={`${nickname}'s hand, ${cards.length} cards`} className={frameClass}>
        <Fan
          orientation={orientation}
          toward={toward}
          width={width}
          height={height}
          maxSpan={maxSpan}
          size={size}
          cardClass={showdownSize ? "h-16 w-11" : stripRevealed ? "h-12 w-8" : undefined}
          flip={flip}
          revealDelay={revealDelay}
          slots={cards.map((card) => ({ id: card.id, phase: "rest" as const, card }))}
        />
      </div>
    );
  }

  return (
    <HiddenFan
      playerId={playerId}
      nickname={nickname}
      count={count}
      orientation={orientation}
      toward={toward}
      width={width}
      height={height}
      maxSpan={maxSpan}
      size={size}
      frameClass={frameClass}
    />
  );
}

function HiddenFan({
  playerId,
  nickname,
  count,
  orientation,
  toward,
  width,
  height,
  maxSpan,
  size,
  frameClass,
}: {
  playerId: string;
  nickname: string;
  count: number;
  orientation: "horizontal" | "vertical";
  toward: Toward;
  width: number;
  height: number;
  maxSpan: number;
  size: "table" | "strip";
  frameClass: string;
}) {
  const [kept, setKept] = useState(count);
  const [leaving, setLeaving] = useState<number[]>([]);
  const [incoming, setIncoming] = useState<number[]>([]);

  if (leaving.length === 0 && incoming.length === 0 && count !== kept) {
    if (count < kept) {
      setLeaving(range(count, kept));
      setKept(count);
    } else {
      setIncoming(range(kept, count));
      setKept(count);
    }
  }

  useEffect(() => {
    if (leaving.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => setLeaving([]), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  useEffect(() => {
    if (incoming.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => setIncoming([]), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [incoming]);

  const indexes = [...range(0, kept), ...leaving];
  if (indexes.length === 0) {
    return null;
  }
  const slots = indexes.map((index) => ({
    id: `${playerId}-hidden-${index}`,
    phase: leaving.includes(index) ? ("out" as const) : incoming.includes(index) ? ("in" as const) : ("rest" as const),
    card: null,
  }));

  return (
    <div role="img" aria-label={`${nickname}'s hidden hand, ${count} cards`} className={cn(frameClass, "card-deal")}>
      <Fan
        orientation={orientation}
        toward={toward}
        width={width}
        height={height}
        maxSpan={maxSpan}
        size={size}
        slots={slots}
      />
    </div>
  );
}

function Fan({
  slots,
  orientation,
  toward,
  width,
  height,
  maxSpan,
  size,
  cardClass,
  flip = false,
  revealDelay = 0,
}: {
  slots: Array<{ id: string; phase: "rest" | "in" | "out"; card: Card | null }>;
  orientation: "horizontal" | "vertical";
  toward: Toward;
  width: number;
  height: number;
  maxSpan: number;
  size: "table" | "strip";
  cardClass?: string;
  flip?: boolean;
  revealDelay?: number;
}) {
  const vertical = orientation === "vertical";
  const axis = vertical ? height : width;
  const step = fanStep(slots.length, axis, maxSpan);
  const spread = Math.min(7, 22 / Math.max(1, slots.length));
  const travel = size === "strip" ? "42px" : "72px";
  const leaveX = toward === "left" ? `-${travel}` : toward === "right" ? travel : "0px";
  const leaveY = toward === "up" ? `-${travel}` : toward === "down" ? travel : "0px";

  return (
    <div className={cn("flex items-center justify-center", vertical ? "flex-col" : "flex-row")}>
      {slots.map((slot, index) => {
        const tilt = (index - (slots.length - 1) / 2) * spread;
        return (
          <div
            key={slot.id}
            className={cn(
              "hand-fan relative",
              slot.phase === "out" && "hand-leave",
              slot.phase === "in" && "hand-arrive",
            )}
            style={{
              marginLeft: !vertical && index > 0 ? -Math.round(axis - step) : undefined,
              marginTop: vertical && index > 0 ? -Math.round(axis - step) : undefined,
              zIndex: slot.phase === "out" ? 40 + index : index + 1,
              animationDelay: slot.phase === "rest" ? undefined : `${index * 35}ms`,
              ["--fan" as string]: `${tilt}deg`,
              ["--leave-x" as string]: leaveX,
              ["--leave-y" as string]: leaveY,
            }}
          >
            {flip && slot.card ? (
              <div className="carramba-flip">
                <div
                  className="carramba-flip-inner"
                  style={{ animationDelay: `${revealDelay + index * 45}ms` }}
                >
                  <div className="carramba-flip-face carramba-flip-back">
                    <PlayingCard
                      decorative
                      mini
                      faceDown
                      className={cardClass ?? (size === "strip" ? "h-8 w-6 rounded-[8px]" : undefined)}
                    />
                  </div>
                  <div className="carramba-flip-face carramba-flip-front">
                    <PlayingCard
                      decorative
                      mini
                      card={slot.card}
                      className={cardClass ?? (size === "strip" ? "h-8 w-6 rounded-[8px]" : undefined)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <PlayingCard
                decorative
                mini
                faceDown={!slot.card}
                card={slot.card ?? undefined}
                className={cardClass ?? (size === "strip" ? "h-8 w-6 rounded-[8px]" : undefined)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function range(start: number, end: number) {
  return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
}
