"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ScoreFields } from "@/components/lobby/score-fields";
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
  const [showChat, setShowChat] = useState(false);
  const [maxScore, setMaxScore] = useState(room.maxScore);
  const [resetScore, setResetScore] = useState(room.resetScore);
  const invite =
    typeof window !== "undefined"
      ? `${window.location.origin}/lobby/join?code=${room.code}`
      : `/lobby/join?code=${room.code}`;

  useEffect(() => {
    if (!showChat) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowChat(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showChat]);

  async function copy(kind: "code" | "link") {
    await navigator.clipboard.writeText(kind === "code" ? room.code : invite);
    setCopied(kind);
  }

  return (
    <div className="safe-screen mx-auto flex h-dvh max-h-dvh w-full max-w-5xl flex-col gap-3 overflow-hidden">
      <header className="shrink-0 text-center">
        <div className="flex items-center justify-center gap-3">
          <BrandMark />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gold">Carramba Room</p>
            <h1 className="font-display text-3xl leading-none sm:text-4xl">Waiting for your friends…</h1>
          </div>
        </div>
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
        <p className="rounded-2xl border border-[var(--danger)] bg-black/40 px-3 py-2 text-center text-sm text-[var(--danger)]">
          {actionError}
        </p>
      )}

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Score settings</p>
        <p className="mt-1 text-sm text-cream/70">
          Maximum {room.maxScore}. An exact {room.maxScore} returns to {room.resetScore}. Private tables do not change rating.
        </p>
        {isHost && (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void onAction({ type: "UPDATE_SETTINGS", maxScore, resetScore });
            }}
          >
            <ScoreFields
              maxScore={maxScore}
              resetScore={resetScore}
              onMaxScore={setMaxScore}
              onResetScore={setResetScore}
            />
            <Button type="submit" variant="secondary" data-testid="save-score-settings">
              Save score settings
            </Button>
          </form>
        )}
      </section>

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
        <Button variant="secondary" className="sm:hidden" onClick={() => setShowChat(true)}>
          Chat
        </Button>
      </div>

      <div className="hidden min-h-0 flex-1 sm:block">
        <ChatPanel
          messages={game?.chat ?? []}
          roomCode={room.code}
          onSend={(text) => onAction({ type: "CHAT", text })}
        />
      </div>

      {showChat && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 sm:hidden">
          <div className="pop-panel flex h-[min(70dvh,32rem)] w-full flex-col rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl">Chat</h2>
              <Button variant="ghost" onClick={() => setShowChat(false)}>
                Close
              </Button>
            </div>
            <ChatPanel
              messages={game?.chat ?? []}
              roomCode={room.code}
              onSend={(text) => onAction({ type: "CHAT", text })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
