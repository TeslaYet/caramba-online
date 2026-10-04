"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayingCard } from "@/components/cards/playing-card";
import { ActionBar } from "@/components/game/action-bar";
import { CarambaConfirm, GameOverOverlay, RoundEndOverlay } from "@/components/game/overlays";
import { PlayerSeat } from "@/components/game/player-seat";
import { ChatPanel } from "@/components/game/chat-panel";
import { Scoreboard } from "@/components/scoreboard/scoreboard";
import { Button } from "@/components/ui/button";
import { calculateHandScore } from "@/lib/game/scoring";
import type { Card, PublicGameState } from "@/lib/game/types";
import { validateDiscard } from "@/lib/game/validators";
import { usePreferences } from "@/components/providers/preferences-provider";

const ANGLES = [
  [90],
  [90, 270],
  [90, 210, 330],
  [90, 180, 270, 0],
  [90, 162, 234, 306, 18],
  [90, 150, 210, 270, 330, 30],
  [90, 141, 193, 244, 296, 347, 39],
  [90, 135, 180, 225, 270, 315, 0, 45],
];

export function GameTable({
  game,
  onAction,
  onLeave,
}: {
  game: PublicGameState;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  onLeave: () => void;
}) {
  const { playSound, sound, setSound, reduceMotion, setReduceMotion } =
    usePreferences();
  const [selected, setSelected] = useState<string[]>([]);
  const [pickupId, setPickupId] = useState<string | null>(null);
  const [selectionEpoch, setSelectionEpoch] = useState(
    `${game.currentPlayerId}:${game.turnPhase}:${game.roundNumber}`,
  );
  if (
    selectionEpoch !== `${game.currentPlayerId}:${game.turnPhase}:${game.roundNumber}`
  ) {
    setSelectionEpoch(`${game.currentPlayerId}:${game.turnPhase}:${game.roundNumber}`);
    setSelected([]);
    setPickupId(null);
  }
  const [confirmCaramba, setConfirmCaramba] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const me = game.me;
  const hand = me?.hand ?? [];
  const selectedCards = hand.filter((card) => selected.includes(card.id));
  const validation = validateDiscard(selectedCards);
  const remainingValue =
    selectedCards.length > 0
      ? calculateHandScore(hand.filter((card) => !selected.includes(card.id)))
      : null;

  const seats = useMemo(() => {
    const selfIndex = Math.max(
      0,
      game.players.findIndex((player) => player.id === me?.id),
    );
    const rotated = [
      ...game.players.slice(selfIndex),
      ...game.players.slice(0, selfIndex),
    ];
    const angles = ANGLES[Math.max(0, rotated.length - 1)] ?? ANGLES[1];
    return rotated.map((player, index) => ({
      player,
      angle: angles[index] ?? 90,
    }));
  }, [game.players, me?.id]);

  const canDrawFromDeck =
    game.status === "PLAYING" && game.turnPhase === "DRAW" && Boolean(game.me?.isCurrent);

  async function drawFromDeck() {
    if (!canDrawFromDeck) {
      return;
    }
    playSound("draw");
    await onAction({ type: "DRAW_FROM_DECK" });
  }

  const eligibleGroup =
    game.discardGroups.find((group) => group.id === game.eligibleDiscardGroupId) ??
    null;
  const latestGroup =
    [...game.discardGroups].reverse().find((group) => group.cards.length > 0) ?? null;
  const shownIds = new Set(
    [latestGroup?.id, eligibleGroup?.id].filter((id): id is string => Boolean(id)),
  );
  const older = game.discardGroups.filter(
    (group) => !shownIds.has(group.id) && group.cards.length > 0,
  );
  const nickname = (playerId: string) =>
    game.players.find((player) => player.id === playerId)?.nickname ?? "Player";

  useEffect(() => {
    if (game.me?.isCurrent && game.status === "PLAYING") {
      playSound("turn");
    }
  }, [game.currentPlayerId, game.status, game.me?.isCurrent, playSound]);

  useEffect(() => {
    if (!game.nextRoundAt) {
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((game.nextRoundAt! - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && game.status === "ROUND_END") {
        void onAction({ type: "NEXT_ROUND" }).catch(() => undefined);
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [game.nextRoundAt, game.status, onAction]);

  return (
    <div className="relative grid h-dvh max-h-dvh grid-rows-[minmax(0,1fr)] overflow-hidden p-2 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-3">
      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold">
              Room {game.roomCode}
            </p>
            <h1 className="font-display text-xl leading-none">
              {game.me?.isCurrent ? "Your turn" : `${game.players.find((p) => p.id === game.currentPlayerId)?.nickname ?? "Player"}'s turn`}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSound(!sound)}>
              Sound: {sound ? "ON" : "OFF"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setReduceMotion(!reduceMotion)}
            >
              {reduceMotion ? "Animations off" : "Reduce animations"}
            </Button>
            <Button variant="ghost" className="lg:hidden" onClick={() => setShowBoard(true)}>
              Scores
            </Button>
            <Button variant="ghost" className="lg:hidden" onClick={() => setShowChat(true)}>
              Chat
            </Button>
            <Button variant="ghost" onClick={onLeave}>
              Leave
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 w-full flex-1">
          <div className="rainbow-rim absolute inset-[6%] rounded-[50%] shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
            <div className="felt-texture h-full w-full rounded-[50%]" />
          </div>
          {seats.map(({ player, angle }) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const x = 50 + Math.cos(rad) * 36;
            const y = 50 + Math.sin(rad) * 34;
            return (
              <div
                key={player.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <PlayerSeat player={player} isSelf={player.id === me?.id} />
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 flex max-h-[68%] w-[70%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 overflow-hidden">
            <div className="flex items-end gap-4">
              <div className="text-center">
                <PlayingCard
                  faceDown
                  eligible={canDrawFromDeck}
                  label={
                    canDrawFromDeck
                      ? `Draw from deck, ${game.drawPileCount} cards left`
                      : `Draw pile, ${game.drawPileCount} cards`
                  }
                  onSelect={canDrawFromDeck ? () => void drawFromDeck() : undefined}
                />
                <p className="mt-1 text-xs text-cream/70">
                  {canDrawFromDeck ? "Click the deck to draw" : `Draw · ${game.drawPileCount}`}
                </p>
              </div>
              {eligibleGroup && eligibleGroup.id !== latestGroup?.id && (
                <DiscardPile
                  title={`Take from ${nickname(eligibleGroup.playerId)}`}
                  cards={eligibleGroup.cards}
                  selectable={Boolean(game.me?.isCurrent && game.turnPhase === "DRAW")}
                  selectedId={pickupId}
                  onSelect={setPickupId}
                />
              )}
            </div>
            {latestGroup ? (
              <DiscardPile
                title={`${nickname(latestGroup.playerId)} played`}
                cards={latestGroup.cards}
                selectable={
                  latestGroup.id === eligibleGroup?.id &&
                  Boolean(game.me?.isCurrent && game.turnPhase === "DRAW")
                }
                selectedId={pickupId}
                onSelect={setPickupId}
              />
            ) : (
              <p className="text-xs text-cream/70">No cards played yet</p>
            )}
            {older.length > 0 && (
              <div className="flex max-w-full flex-wrap justify-center gap-1">
                {older.slice(-4).map((group) => (
                  <div key={group.id} className="text-center">
                    <div className="flex justify-center gap-0.5">
                      {group.cards.map((card) => (
                        <PlayingCard key={card.id} card={card} compact />
                      ))}
                    </div>
                    <p className="text-[10px] text-cream/70">{nickname(group.playerId)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-center gap-1.5 pt-1" data-testid="player-hand">
          {hand.map((card) => (
            <PlayingCard
              key={card.id}
              card={card}
              selected={selected.includes(card.id)}
              onSelect={() => {
                playSound("select");
                setSelected((current) =>
                  current.includes(card.id)
                    ? current.filter((id) => id !== card.id)
                    : [...current, card.id],
                );
              }}
            />
          ))}
        </div>

        <ActionBar
          game={game}
          validation={
            selected.length === 0
              ? { valid: false, type: "INVALID", reason: "EMPTY_SELECTION", message: "Select at least one card." }
              : validation
          }
          selectedCount={selected.length}
          remainingValue={remainingValue}
          canTake={Boolean(eligibleGroup && pickupId)}
          onPlay={async () => {
            playSound("discard");
            await onAction({ type: "PLAY_CARDS", cardIds: selected });
          }}
          onDraw={drawFromDeck}
          onTake={async () => {
            if (!pickupId) {
              return;
            }
            playSound("draw");
            await onAction({
              type: "TAKE_FROM_PREVIOUS_DISCARD",
              cardId: pickupId,
            });
          }}
          onCaramba={() => setConfirmCaramba(true)}
        />
      </div>

      <aside className="hidden min-h-0 flex-col gap-2 overflow-y-auto lg:flex">
        <Scoreboard game={game} />
        <ChatPanel
          messages={game.chat}
          onSend={(text) => onAction({ type: "CHAT", text })}
        />
      </aside>

      {showBoard && (
        <MobileDrawer title="Scores" onClose={() => setShowBoard(false)}>
          <Scoreboard game={game} />
        </MobileDrawer>
      )}
      {showChat && (
        <MobileDrawer title="Chat" onClose={() => setShowChat(false)}>
          <ChatPanel
            messages={game.chat}
            onSend={(text) => onAction({ type: "CHAT", text })}
          />
        </MobileDrawer>
      )}

      {game.status === "ROUND_END" && (
        <RoundEndOverlay
          game={game}
          secondsLeft={secondsLeft}
          onNext={() => onAction({ type: "NEXT_ROUND" })}
        />
      )}
      {game.status === "GAME_OVER" && (
        <GameOverOverlay
          game={game}
          isHost={Boolean(game.me?.isHost)}
          onRematch={() => onAction({ type: "REMATCH" })}
          onLobby={() => onAction({ type: "BACK_TO_LOBBY" })}
          onLeave={onLeave}
        />
      )}
      {confirmCaramba && (
        <CarambaConfirm
          handValue={game.me?.handValue ?? 0}
          onCancel={() => setConfirmCaramba(false)}
          onConfirm={async () => {
            playSound("caramba");
            setConfirmCaramba(false);
            await onAction({ type: "CALL_CARAMBA" });
          }}
        />
      )}
    </div>
  );
}

function DiscardPile({
  title,
  cards,
  selectable,
  selectedId,
  onSelect,
}: {
  title: string;
  cards: Card[];
  selectable: boolean;
  selectedId: string | null;
  onSelect: (cardId: string) => void;
}) {
  return (
    <div className="text-center">
      <div className="flex flex-wrap justify-center gap-1">
        {cards.map((card) => (
          <PlayingCard
            key={card.id}
            card={card}
            eligible={selectable}
            selected={selectedId === card.id}
            onSelect={selectable ? () => onSelect(card.id) : undefined}
            compact
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-gold">{title}</p>
    </div>
  );
}

function MobileDrawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60 p-3 lg:hidden">
      <div className="pop-panel ml-auto flex h-full max-w-md flex-col rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
