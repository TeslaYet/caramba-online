"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicGameState, RoomRecord } from "@/lib/game/types";
import type { RoomPlayer } from "@/lib/store/types";

export type RoomSnapshot = {
  room: RoomRecord;
  players: RoomPlayer[];
  viewerId: string | null;
  game: PublicGameState | null;
};

export function useRoom(code: string) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to load the room.");
      return;
    }
    setSnapshot(data);
    setError(null);
  }, [code]);

  useEffect(() => {
    const source = new EventSource(`/api/rooms/${code}/events`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        setError("This room is no longer available.");
        return;
      }
      setSnapshot(data);
      setError(null);
    };
    source.onerror = () => {
      void load();
    };
    return () => {
      source.close();
    };
  }, [code, load]);

  const act = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      try {
        const response = await fetch(`/api/rooms/${code}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 409) {
            await load();
          }
          const message = data.error ?? "That action could not be completed.";
          setActionError(message);
          throw new Error(message);
        }
        setActionError(null);
        if (data.room) {
          setSnapshot(data);
        } else if (data.id && snapshot) {
          setSnapshot({ ...snapshot, game: data });
        }
        return data;
      } finally {
        setBusy(false);
      }
    },
    [code, snapshot, load],
  );

  return useMemo(
    () => ({ snapshot, error, actionError, busy, act, reload: load }),
    [snapshot, error, actionError, busy, act, load],
  );
}
