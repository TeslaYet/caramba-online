"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { GameTable } from "@/components/game/game-table";
import { useRoom } from "@/lib/realtime/use-room";
import type { PublicGameState } from "@/lib/game/types";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<PublicGameState | null>(null);

  useEffect(() => {
    void fetch(`/api/game/${params.id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.game) {
          setBootstrap(data.game);
          setCode(data.game.roomCode);
        }
      });
  }, [params.id]);

  if (!code) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        <BrandMark />
        Restoring the table…
      </main>
    );
  }

  return (
    <ConnectedGame
      code={code}
      fallback={bootstrap}
      onLeave={() => router.push("/")}
      onLobby={(roomCode) => router.push(`/room/${roomCode}`)}
    />
  );
}

function ConnectedGame({
  code,
  fallback,
  onLeave,
  onLobby,
}: {
  code: string;
  fallback: PublicGameState | null;
  onLeave: () => void;
  onLobby: (code: string) => void;
}) {
  const { snapshot, act, error, actionError } = useRoom(code);
  const game = snapshot?.game ?? fallback;

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        {error}
      </main>
    );
  }

  if (!game || game.status === "LOBBY") {
    return (
      <LobbyRedirect
        shouldRedirect={snapshot?.room.status === "LOBBY"}
        onLobby={() => onLobby(code)}
      />
    );
  }

  return (
    <GameTable
      game={game}
      onAction={async (payload) => {
        const result = await act(payload).catch(() => null);
        if (payload.type === "LEAVE") {
          onLeave();
        }
        if (payload.type === "BACK_TO_LOBBY") {
          onLobby(code);
        }
        return result;
      }}
      onLeave={async () => {
        await act({ type: "LEAVE" });
        onLeave();
      }}
      actionError={actionError}
    />
  );
}

function LobbyRedirect({
  shouldRedirect,
  onLobby,
}: {
  shouldRedirect: boolean;
  onLobby: () => void;
}) {
  useEffect(() => {
    if (shouldRedirect) {
      onLobby();
    }
  }, [shouldRedirect, onLobby]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      Loading game…
    </main>
  );
}
