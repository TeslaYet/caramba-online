"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shouldApplySnapshot } from "@/lib/realtime/snapshot-order";
import type { PublicGameState, RoomRecord } from "@/lib/game/types";
import type { RoomPlayer } from "@/lib/store/types";

export type RoomConnection = "connecting" | "live" | "reconnecting";

export type RoomSnapshot = {
  room: RoomRecord;
  players: RoomPlayer[];
  viewerId: string | null;
  game: PublicGameState | null;
};

const ACTION_TIMEOUT_MS = 12_000;

export function useRoom(code: string) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<RoomConnection>("connecting");
  const inflight = useRef(false);

  const apply = useCallback((incoming: RoomSnapshot) => {
    setSnapshot((current) => (shouldApplySnapshot(current, incoming) ? incoming : current));
  }, []);

  const load = useCallback(async () => {
    const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to load the room.");
      return;
    }
    apply(data);
    setError(null);
  }, [apply, code]);

  useEffect(() => {
    const source = new EventSource(`/api/rooms/${code}/events`);
    let fallback: number | null = null;
    source.onopen = () => {
      if (fallback !== null) {
        window.clearTimeout(fallback);
        fallback = null;
      }
      setConnection("live");
    };
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        setError("This room is no longer available.");
        return;
      }
      apply(data);
      setError(null);
      setConnection("live");
    };
    source.onerror = () => {
      setConnection("reconnecting");
      if (fallback !== null) {
        return;
      }
      fallback = window.setTimeout(() => {
        fallback = null;
        void load();
      }, 2500);
    };
    return () => {
      if (fallback !== null) {
        window.clearTimeout(fallback);
      }
      source.close();
    };
  }, [apply, code, load]);

  const act = useCallback(
    async (payload: Record<string, unknown>) => {
      if (inflight.current) {
        return null;
      }
      inflight.current = true;
      setBusy(true);
      const started = performance.now();
      try {
        const response = await fetch(`/api/rooms/${code}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(ACTION_TIMEOUT_MS),
        });
        const data = await response.json();
        if (process.env.NODE_ENV !== "production") {
          console.info(
            JSON.stringify({
              scope: "sync",
              event: "action",
              type: payload.type,
              ms: Math.round(performance.now() - started),
              status: response.status,
            }),
          );
        }
        if (!response.ok) {
          if (response.status === 409 || response.status >= 500) {
            await load();
          }
          const message = data.error ?? "That action could not be completed.";
          setActionError(message);
          throw new Error(message);
        }
        setActionError(null);
        if (data.room) {
          apply(data);
        } else if (data.id && snapshot) {
          apply({ ...snapshot, game: data });
        }
        return data;
      } catch (error) {
        if (!(error instanceof Error) || error.name === "TimeoutError" || error.name === "AbortError") {
          await load();
          const message = "The table was checked with the server. That action was not sent again.";
          setActionError(message);
          throw new Error(message);
        }
        if (error instanceof TypeError) {
          await load();
          const message = "The connection dropped. The table was restored from the server.";
          setActionError(message);
          throw new Error(message);
        }
        throw error;
      } finally {
        inflight.current = false;
        setBusy(false);
      }
    },
    [apply, code, load, snapshot],
  );

  return useMemo(
    () => ({ snapshot, error, actionError, busy, connection, act, reload: load }),
    [snapshot, error, actionError, busy, connection, act, load],
  );
}
