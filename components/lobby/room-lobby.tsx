"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/game/chat-panel";
import { PlayerSeat } from "@/components/game/player-seat";
import type { RoomSnapshot } from "@/lib/realtime/use-room";

export function RoomLobby({
  snapshot,
  selfId,
  actionError,
  onAction,
}: {
  snapshot: RoomSnapshot;
  selfId: string | null;
  actionError?: string | null;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const { room, players, game } = snapshot;
  const self = players.find((player) => player.id === selfId);
  const isHost = room.hostPlayerId === selfId;
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const invite =
    typeof window !== "undefined"
      ? `${window.location.origin}/lobby/join?code=${room.code}`
      : `/lobby/join?code=${room.code}`;

  async function copy(kind: "code" | "link") {
    await navigator.clipboard.writeText(kind === "code" ? room.code : invite);
    setCopied(kind);
  }

  return (
    <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-5xl flex-col gap-3 overflow-hidden px-4 py-4">
      <header className="shrink-0 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Carramba Room</p>
        <h1 className="font-display text-4xl leading-none">Waiting for your friends…</h1>
        <p className="mt-2 text-cream/70">Room code: {room.code}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="gold" onClick={() => copy("code")} data-testid="copy-code">
            {copied === "code" ? "Copied code" : "Copy Code"}
          </Button>
          <Button variant="secondary" onClick={() => copy("link")}>
            {copied === "link" ? "Copied link" : "Copy Invite Link"}
          </Button>
        </div>
      </header>

      <div className="rainbow-rim mx-auto w-full max-w-3xl shrink-0 rounded-[32px]">
      <div className="felt-texture grid grid-cols-2 gap-3 rounded-[32px] p-6 sm:grid-cols-4">
        {players.map((player) => (
          <div key={player.id} className="relative">
            <PlayerSeat
              player={{
                id: player.id,
                nickname: player.nickname,
                seatIndex: player.seatIndex,
                cardCount: 0,
                score: 0,
                lastRoundScore: null,
                eliminated: false,
                connected: player.connected,
                ready: player.ready,
                isHost: player.id === room.hostPlayerId,
                isCurrent: false,
                hand: null,
              }}
              isSelf={player.id === selfId}
            />
            <p className="mt-1 text-center text-xs uppercase tracking-wide text-gold">
              {player.id === room.hostPlayerId
                ? "Host"
                : player.ready
                  ? "Ready"
                  : "Not ready"}
            </p>
            {isHost && player.id !== selfId && (
              <button
                className="absolute right-1 top-1 text-xs text-cream/50"
                onClick={() => onAction({ type: "KICK", playerId: player.id })}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      </div>

      {actionError && (
        <p className="text-center text-sm text-[var(--danger)]">{actionError}</p>
      )}

      <div className="flex shrink-0 flex-wrap justify-center gap-2">
        <Button
          variant={self?.ready ? "secondary" : "primary"}
          onClick={() => onAction({ type: self?.ready ? "UNREADY" : "READY" })}
          data-testid="ready-button"
        >
          {self?.ready ? "Unready" : "Ready"}
        </Button>
        {isHost && (
          <>
            <Button onClick={() => onAction({ type: "START" })} data-testid="start-game">
              Start Game
            </Button>
            <Button variant="danger" onClick={() => onAction({ type: "CLOSE" })}>
              Close Room
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={() => onAction({ type: "LEAVE" })}>
          Leave Room
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <ChatPanel
          messages={game?.chat ?? []}
          onSend={(text) => onAction({ type: "CHAT", text })}
        />
      </div>
    </div>
  );
}
