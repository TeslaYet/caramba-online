"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { GameTable } from "@/components/game/game-table";
import { RoomLobby } from "@/components/lobby/room-lobby";
import { useRoom } from "@/lib/realtime/use-room";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code ?? "").toUpperCase();
  const { snapshot, error, actionError, connection, act } = useRoom(code);

  useEffect(() => {
    if (snapshot?.game?.status === "PLAYING" && snapshot.game.id) {
      router.replace(`/game/${snapshot.game.id}`);
    }
  }, [router, snapshot?.game?.id, snapshot?.game?.status]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <BrandMark className="mx-auto mb-4" />
          <h1 className="font-display text-4xl">Room unavailable</h1>
          <p className="mt-2 text-cream/70">{error}</p>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        <BrandMark />
        Loading table…
      </main>
    );
  }

  const inPlay =
    snapshot.game &&
    snapshot.game.status !== "LOBBY" &&
    snapshot.room.status !== "LOBBY";

  if (inPlay && snapshot.game) {
    return (
      <GameTable
        game={snapshot.game}
        onAction={async (payload) => act(payload).catch(() => null)}
        onLeave={async () => {
          await act({ type: "LEAVE" }).catch(() => null);
          router.push("/");
        }}
        actionError={actionError}
        connection={connection}
      />
    );
  }

  return (
    <RoomLobby
      snapshot={snapshot}
      selfId={snapshot.viewerId}
      actionError={actionError}
      connection={connection}
      onAction={async (payload) => {
        try {
          const result = await act(payload);
          if (payload.type === "LEAVE" || payload.type === "CLOSE") {
            router.push("/");
          }
          return result;
        } catch {
          return null;
        }
      }}
    />
  );
}
