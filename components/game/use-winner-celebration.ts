"use client";

import { useEffect, useState } from "react";
import type { PublicGameState } from "@/lib/game/types";
import { WINNER_BEATS, winnerPhase, type WinnerPhase } from "@/lib/ui/winner-celebration";

export function useWinnerCelebration(
  game: PublicGameState,
  reduceMotion: boolean,
  blocked: boolean,
): { phase: WinnerPhase | null; fresh: boolean } {
  const eventId =
    game.status === "GAME_OVER"
      ? ([...game.events].reverse().find((event) => event.type === "GAME_FINISHED")?.id ?? "game-over")
      : null;
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
    if (!eventId || playingId !== eventId || blocked) {
      return;
    }
    const doneAt = reduceMotion ? WINNER_BEATS.reduced.settled : WINNER_BEATS.full.settled;
    if (doneAt === 0) {
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const next = Date.now() - started;
      setElapsed(next);
      if (next >= doneAt) {
        window.clearInterval(timer);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [blocked, eventId, playingId, reduceMotion]);

  if (!eventId) {
    return { phase: null, fresh: false };
  }
  const fresh = playingId === eventId || starting;
  if (blocked) {
    return { phase: null, fresh };
  }
  if (fresh) {
    return { phase: winnerPhase(starting ? 0 : elapsed, reduceMotion), fresh: true };
  }
  return { phase: "settled", fresh: false };
}
