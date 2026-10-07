"use client";

import { useEffect, useState } from "react";
import { SHOWDOWN_BEATS, showdownPhase, type ShowdownPhase } from "@/lib/ui/carramba-showdown";
import type { PublicGameState } from "@/lib/game/types";

export function useCarrambaShowdown(
  game: PublicGameState,
  reduceMotion: boolean,
): ShowdownPhase | null {
  const eventId =
    [...game.events].reverse().find((event) => event.type === "CARAMBA_CALLED")?.id ?? null;
  const active =
    Boolean(eventId) && (game.status === "ROUND_END" || game.status === "GAME_OVER");
  const [origin] = useState(eventId);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const starting = Boolean(eventId && eventId !== origin && playingId !== eventId);
  if (starting && eventId) {
    setPlayingId(eventId);
    if (elapsed !== 0) {
      setElapsed(0);
    }
  }

  useEffect(() => {
    if (!active || !playingId || playingId !== eventId) {
      return;
    }
    const started = Date.now();
    const resultAt = reduceMotion ? SHOWDOWN_BEATS.reduced.result : SHOWDOWN_BEATS.full.result;
    const timer = window.setInterval(() => {
      const next = Date.now() - started;
      setElapsed(next);
      if (next >= resultAt) {
        window.clearInterval(timer);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [active, eventId, playingId, reduceMotion]);

  if (!active) {
    return null;
  }
  if (playingId === eventId || starting) {
    return showdownPhase(starting ? 0 : elapsed, reduceMotion);
  }
  return "result";
}
