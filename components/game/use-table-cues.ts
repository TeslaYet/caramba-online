"use client";

import { useEffect, useState } from "react";
import {
  cueMemoryFrom,
  presentNewEvents,
  type CueMemory,
  type TableCue,
} from "@/lib/game/table-cues";
import type { PublicGameState } from "@/lib/game/types";
import { usePreferences, type SoundKind } from "@/components/providers/preferences-provider";

const SOUND: Partial<Record<TableCue["kind"], SoundKind>> = {
  discard: "discard",
  draw: "draw",
  pickup: "draw",
  caramba: "caramba",
  eliminated: "eliminate",
  finished: "victory",
};

export function useTableCues(game: PublicGameState): TableCue[] {
  const { playSound, reduceMotion } = usePreferences();
  const [memory, setMemory] = useState<CueMemory | null>(null);
  const [cues, setCues] = useState<TableCue[]>([]);
  const hand = game.me?.hand ?? [];

  if (memory === null) {
    setMemory(
      cueMemoryFrom({
        gameId: game.id,
        version: game.version,
        events: game.events,
        groups: game.discardGroups,
        handIds: hand.map((card) => card.id),
      }),
    );
  } else if (memory.gameId !== game.id || memory.version !== game.version) {
    const result = presentNewEvents({
      memory,
      gameId: game.id,
      version: game.version,
      events: game.events,
      groups: game.discardGroups,
      hand,
      selfId: game.me?.id ?? null,
    });
    setMemory(result.memory);
    setCues(result.cues);
  }

  useEffect(() => {
    if (cues.length === 0) {
      return;
    }
    for (const cue of cues) {
      const kind = SOUND[cue.kind];
      if (kind) {
        playSound(kind);
      }
    }
    const timer = window.setTimeout(() => setCues([]), reduceMotion ? 0 : 260);
    return () => window.clearTimeout(timer);
  }, [cues, playSound, reduceMotion]);

  return reduceMotion ? [] : cues;
}
