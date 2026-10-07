"use client";

import { BrandMark } from "@/components/brand/brand-mark";
import { GAME_RULES } from "@/lib/game/rules";
import type { RoundResult } from "@/lib/game/types";

export function CarrambaAnnouncement({
  caller,
  reduceMotion,
}: {
  caller: string;
  reduceMotion: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] grid place-items-center bg-[radial-gradient(circle_at_center,rgba(18,8,4,0.28),rgba(8,4,2,0.72)_68%)]">
      <p className="sr-only" aria-live="assertive">
        {caller} called Carramba. Revealing all players&apos; hands.
      </p>
      <div className={reduceMotion ? "carramba-logo-still" : "carramba-logo-burst"}>
        <BrandMark size="hero" className="mx-auto h-auto w-[min(62vw,16rem)] sm:w-[min(42vw,22rem)]" />
        {!reduceMotion && <span className="carramba-impact" aria-hidden />}
      </div>
    </div>
  );
}

export function showdownAnnouncement(result: RoundResult) {
  if (result.success) {
    return "Carramba successful. The caller scores 0.";
  }
  if (result.reason === "TIED_LOWEST") {
    return `Carramba failed. Another player had the same hand value. Caller receives a ${GAME_RULES.CARAMBA_PENALTY} point penalty.`;
  }
  return `Carramba failed. Another player had a lower hand. Caller receives a ${GAME_RULES.CARAMBA_PENALTY} point penalty.`;
}
