"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { PlayingCard } from "@/components/cards/playing-card";
import { ActionBar } from "@/components/game/action-bar";
import { TableMotion } from "@/components/game/table-motion";
import { useTableCues } from "@/components/game/use-table-cues";
import { CarambaConfirm, RoundEndOverlay } from "@/components/game/overlays";
import { CarrambaAnnouncement, showdownAnnouncement } from "@/components/game/carramba-showdown";
import { useCarrambaShowdown } from "@/components/game/use-carramba-showdown";
import { WinnerCelebration } from "@/components/game/winner-celebration";
import { useWinnerCelebration } from "@/components/game/use-winner-celebration";
import { OpponentHand } from "@/components/game/opponent-hand";
import { PlayerSeat } from "@/components/game/player-seat";
import { showdownFacesVisible } from "@/lib/ui/carramba-showdown";
import { seatSide } from "@/lib/ui/hidden-hand";
import { cn } from "@/lib/utils/cn";
import { ChatPanel } from "@/components/game/chat-panel";
import { Scoreboard } from "@/components/scoreboard/scoreboard";
import { Button } from "@/components/ui/button";
import { calculateHandScore } from "@/lib/game/scoring";
import type { Card, PublicGameState } from "@/lib/game/types";
import { validateDiscard } from "@/lib/game/validators";
import { useAdaptiveDevice } from "@/components/providers/adaptive-device";
import { usePreferences } from "@/components/providers/preferences-provider";
import { latestOtherMessage, unreadCount } from "@/lib/ui/chat-notice";

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
  actionError,
}: {
  game: PublicGameState;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  onLeave: () => void;
  actionError?: string | null;
}) {
  const { playSound, sound, setSound, reduceMotion, setReduceMotion } =
    usePreferences();
  const { hasHover, isDesktop } = useAdaptiveDevice();
  const showdown = useCarrambaShowdown(game, reduceMotion);
  const facesVisible = showdownFacesVisible(showdown);
  const celebration = useWinnerCelebration(
    game,
    reduceMotion,
    showdown !== null && showdown !== "result",
  );
  const deferScores = showdown !== null && showdown !== "result";
  const cues = useTableCues(game);
  const [selected, setSelected] = useState<string[]>([]);
  const [choosingDiscard, setChoosingDiscard] = useState(false);
  const [pendingTakeId, setPendingTakeId] = useState<string | null>(null);
  const pendingTake = useRef<string | null>(null);
  const [selectionEpoch, setSelectionEpoch] = useState(
    `${game.currentPlayerId}:${game.turnPhase}:${game.roundNumber}`,
  );
  if (
    selectionEpoch !== `${game.currentPlayerId}:${game.turnPhase}:${game.roundNumber}`
  ) {
    setSelectionEpoch(`${game.currentPlayerId}:${game.turnPhase}:${game.roundNumber}`);
    setSelected([]);
    setChoosingDiscard(false);
    setPendingTakeId(null);
  }
  const turnKey = `${game.currentPlayerId}:${game.turnPhase}:${game.roundNumber}`;
  useEffect(() => {
    pendingTake.current = null;
  }, [turnKey]);
  const [confirmCaramba, setConfirmCaramba] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const latestChat = game.chat.at(-1)?.timestamp ?? 0;
  const [readMark, setReadMark] = useState(0);
  const chatNotice = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const me = game.me;
  const chatOpen = isDesktop || showChat;
  if (chatOpen && readMark !== latestChat) {
    setReadMark(latestChat);
  }
  const unread = chatOpen ? 0 : unreadCount(game.chat, me?.id ?? null, readMark);
  const otherMessage = latestOtherMessage(game.chat, me?.id ?? null);

  useEffect(() => {
    if (!chatNotice.current) {
      chatNotice.current = true;
      return;
    }
    if (unread > 0) {
      playSound("notification");
    }
  }, [unread, playSound]);
  const meLine = game.roundResult?.lines.find((line) => line.playerId === me?.id);
  const shownScore = deferScores && meLine ? meLine.previousTotal : me?.score ?? 0;
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

  const canDrawOrTake =
    game.status === "PLAYING" && game.turnPhase === "DRAW" && Boolean(game.me?.isCurrent);

  async function drawFromDeck() {
    if (pendingTake.current || !canDrawOrTake) {
      return;
    }
    pendingTake.current = "deck";
    setPendingTakeId("deck");
    try {
      await onAction({ type: "DRAW_FROM_DECK" });
    } finally {
      if (pendingTake.current === "deck") {
        pendingTake.current = null;
        setPendingTakeId(null);
      }
    }
  }

  function submitTake(cardId: string) {
    if (pendingTake.current || !canDrawOrTake) {
      return;
    }
    const group = game.discardGroups.find((entry) => entry.id === game.eligibleDiscardGroupId);
    if (!group?.cards.some((card) => card.id === cardId)) {
      return;
    }
    pendingTake.current = cardId;
    setPendingTakeId(cardId);
    setChoosingDiscard(false);
    void onAction({ type: "TAKE_FROM_PREVIOUS_DISCARD", cardId }).finally(() => {
      if (pendingTake.current === cardId) {
        pendingTake.current = null;
        setPendingTakeId(null);
      }
    });
  }

  function takeDiscardButton() {
    const group = game.discardGroups.find((entry) => entry.id === game.eligibleDiscardGroupId);
    const cards = group?.cards ?? [];
    if (cards.length === 1 && cards[0]) {
      submitTake(cards[0].id);
      return;
    }
    if (cards.length > 1) {
      setChoosingDiscard(true);
    }
  }

  function seatOffset(playerId: string) {
    const seat = seats.find((entry) => entry.player.id === playerId);
    const rad = (((seat?.angle ?? 90) - 90) * Math.PI) / 180;
    return { x: Math.cos(rad) * 150, y: Math.sin(rad) * 100 };
  }

  function noticeFor(playerId: string) {
    const cue = [...cues].reverse().find((entry) => "actorId" in entry && entry.actorId === playerId);
    if (!cue) {
      return null;
    }
    if (cue.kind === "discard") {
      return "Discarded";
    }
    if (cue.kind === "draw") {
      return "Drew";
    }
    if (cue.kind === "pickup") {
      return "Took a card";
    }
    if (cue.kind === "caramba") {
      return "Carramba";
    }
    return null;
  }

  const turnName =
    game.players.find((player) => player.id === game.currentPlayerId)?.nickname ?? "Waiting";

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

  const showdownSeen = useRef<typeof showdown>(null);
  useEffect(() => {
    if (showdownSeen.current && showdownSeen.current !== "result" && showdown === "result") {
      playSound("result");
    }
    showdownSeen.current = showdown;
  }, [showdown, playSound]);

  const winnerHeard = useRef(false);
  useEffect(() => {
    if (winnerHeard.current || !celebration.fresh || !celebration.phase) {
      return;
    }
    const reveal = celebration.phase === "name" || (reduceMotion && celebration.phase === "settled");
    if (!reveal) {
      return;
    }
    winnerHeard.current = true;
    playSound("victory");
  }, [celebration.fresh, celebration.phase, playSound, reduceMotion]);

  useEffect(() => {
    if (game.me?.isCurrent && game.status === "PLAYING") {
      playSound("turn");
    }
  }, [game.currentPlayerId, game.status, game.me?.isCurrent, playSound]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setConfirmCaramba(false);
      setShowBoard(false);
      setShowChat(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    <div className="safe-screen relative grid h-dvh max-h-dvh grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BrandMark className="h-9 w-9" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold">
                Room {game.roomCode}
              </p>
              <h1 className="font-display text-xl leading-none">
                {game.me?.isCurrent ? "Your turn" : `${game.players.find((p) => p.id === game.currentPlayerId)?.nickname ?? "Player"}'s turn`}
              </h1>
              <p className="text-xs text-cream/70 sm:hidden">{shownScore} pts</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-1 sm:gap-2">
            <Button variant="ghost" className="px-2.5 py-1.5 text-xs sm:px-3 sm:py-2.5 sm:text-sm" onClick={() => setSound(!sound)}>
              <span className="sm:hidden">{sound ? "Sound" : "Muted"}</span>
              <span className="hidden sm:inline">Sound: {sound ? "ON" : "OFF"}</span>
            </Button>
            <Button variant="ghost" className="px-2.5 py-1.5 text-xs sm:px-3 sm:py-2.5 sm:text-sm" onClick={() => setReduceMotion(!reduceMotion)}>
              <span className="sm:hidden">{reduceMotion ? "Still" : "Motion"}</span>
              <span className="hidden sm:inline">
                {reduceMotion ? "Animations off" : "Reduce animations"}
              </span>
            </Button>
            <Button variant="ghost" className="px-2.5 py-1.5 text-xs sm:px-4 sm:py-2.5 sm:text-sm lg:hidden" onClick={() => setShowBoard(true)}>
              Scores
            </Button>
            <Button variant="ghost" className="relative px-2.5 py-1.5 text-xs sm:px-4 sm:py-2.5 sm:text-sm lg:hidden" onClick={() => setShowChat(true)} data-testid="chat-button">
              Chat{unread > 0 ? ` · ${unread}` : ""}
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--gold)]" />
              )}
            </Button>
            <Button variant="ghost" className="px-2.5 py-1.5 text-xs sm:px-4 sm:py-2.5 sm:text-sm" onClick={onLeave}>
              Leave
            </Button>
          </div>
          {unread > 0 && otherMessage && (
            <p className="w-full truncate text-right text-[11px] text-gold lg:hidden" data-testid="chat-notice">
              New message · {otherMessage.nickname}: {otherMessage.text}
            </p>
          )}
        </header>

        <div className="flex shrink-0 gap-3 overflow-x-auto pb-1 sm:hidden">
          {seats
            .filter((seat) => seat.player.id !== me?.id)
            .map(({ player }) => (
              <div
                key={player.id}
                className={cn(
                  "flex shrink-0 flex-col items-center rounded-2xl border px-2 py-1",
                  player.isCurrent ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-white/15 bg-black/20",
                  player.eliminated && "opacity-60 grayscale",
                )}
              >
                <OpponentHand
                  playerId={player.id}
                  nickname={player.nickname}
                  count={player.cardCount}
                  cards={facesVisible ? player.hand : null}
                  orientation="horizontal"
                  toward="down"
                  active={player.isCurrent || game.roundResult?.callerId === player.id}
                  eliminated={player.eliminated}
                  size="strip"
                  flip={showdown === "reveal" && !reduceMotion}
                />
                <p className="max-w-[6.5rem] truncate text-[11px] font-semibold">{player.nickname}</p>
                <HandValue playerId={player.id} game={game} facesVisible={facesVisible} />
                <p className="text-[10px] tabular-nums text-cream/70">
                  {player.cardCount}
                  {noticeFor(player.id) ? ` · ${noticeFor(player.id)}` : ""}
                </p>
              </div>
            ))}
        </div>

        <div className={cn("table-stage relative min-h-0 w-full flex-1", showdown === "announce" && !reduceMotion && "carramba-stage")}>
          <div className="rainbow-rim absolute inset-[6%] rounded-[50%] shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
            <div className="felt-texture h-full w-full rounded-[50%]" />
          </div>
          {seats.map(({ player, angle }, index) => {
            const side = seatSide(angle);
            const rad = ((angle - 90) * Math.PI) / 180;
            const x = 50 + Math.cos(rad) * 36;
            const y = 50 + Math.sin(rad) * 30;
            const isSelf = player.id === me?.id;
            const line = game.roundResult?.lines.find((entry) => entry.playerId === player.id);
            const seated = deferScores && line
              ? {
                  ...player,
                  score: line.previousTotal,
                  lastRoundScore: null,
                  eliminated: player.eliminated && !line.eliminatedThisRound,
                }
              : player;
            return (
              <div
                key={player.id}
                className={cn(
                  "pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 sm:block",
                  facesVisible ? "z-30" : "z-20",
                )}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {!isSelf && (
                  <div
                    className={cn(
                      "absolute",
                      side === "top" && "bottom-full left-1/2 mb-1 -translate-x-1/2",
                      side === "bottom" && !facesVisible && "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
                      side === "bottom" && facesVisible && "bottom-full left-1/2 mb-1 -translate-x-1/2",
                      side === "left" && !facesVisible && "right-full top-1/2 mr-1 -translate-y-1/2",
                      side === "right" && !facesVisible && "left-full top-1/2 ml-1 -translate-y-1/2",
                      (side === "left" || side === "right") && facesVisible && "bottom-full left-1/2 mb-2 -translate-x-1/2",
                    )}
                  >
                    <OpponentHand
                      playerId={player.id}
                      nickname={player.nickname}
                      count={player.cardCount}
                      cards={facesVisible ? player.hand : null}
                      orientation={facesVisible || side === "top" || side === "bottom" ? "horizontal" : "vertical"}
                      toward={side === "bottom" && !facesVisible ? "up" : side === "left" && !facesVisible ? "right" : side === "right" && !facesVisible ? "left" : "down"}
                      active={player.isCurrent || (showdown !== null && game.roundResult?.callerId === player.id)}
                      eliminated={seated.eliminated}
                      readable={facesVisible}
                      flip={showdown === "reveal" && !reduceMotion}
                      revealDelay={index * 80}
                    />
                  </div>
                )}
                <PlayerSeat
                  player={seated}
                  isSelf={isSelf}
                  notice={noticeFor(player.id)}
                />
                {!isSelf && <HandValue playerId={player.id} game={game} facesVisible={facesVisible} />}
              </div>
            );
          })}

          <TableMotion cues={cues} seatOffset={seatOffset} showCall={showdown === null} />
          <p
            key={game.currentPlayerId ?? "waiting"}
            className="turn-chip absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-gold sm:hidden"
            aria-live="polite"
          >
            {game.status === "PLAYING"
              ? game.me?.isCurrent
                ? "Your turn"
                : `${turnName}'s turn`
              : `Round ${game.roundNumber || 1}`}
          </p>
          <div className="table-center absolute left-1/2 top-1/2 flex max-h-[78%] w-[88%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 overflow-hidden">
            <div className="flex items-end gap-3">
              <div className="text-center">
                <PlayingCard
                  faceDown
                  eligible={canDrawOrTake}
                  label={
                    canDrawOrTake
                      ? `Draw from deck, ${game.drawPileCount} cards left`
                      : `Draw pile, ${game.drawPileCount} cards`
                  }
                  onSelect={
                    canDrawOrTake && pendingTakeId === null ? () => void drawFromDeck() : undefined
                  }
                />
                <p className="mt-1 text-xs text-cream/70">
                  {canDrawOrTake
                    ? hasHover
                      ? "Click the deck to draw"
                      : "Tap the deck to draw"
                    : `Draw · ${game.drawPileCount}`}
                </p>
              </div>
              {eligibleGroup && eligibleGroup.id !== latestGroup?.id && (
                <DiscardPile
                  title={`Take one from ${nickname(eligibleGroup.playerId)}`}
                  cards={eligibleGroup.cards}
                  selectable={canDrawOrTake}
                  emphasized={choosingDiscard}
                  pendingId={pendingTakeId}
                  onSelect={submitTake}
                />
              )}
            </div>
            {latestGroup ? (
              <DiscardPile
                title={
                  latestGroup.id === eligibleGroup?.id && canDrawOrTake
                    ? `Take one · ${hasHover ? "click" : "tap"} a card`
                    : `${nickname(latestGroup.playerId)} played`
                }
                cards={latestGroup.cards}
                selectable={latestGroup.id === eligibleGroup?.id && canDrawOrTake}
                emphasized={choosingDiscard && latestGroup.id === eligibleGroup?.id}
                pendingId={pendingTakeId}
                onSelect={submitTake}
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

        <div
          className="flex shrink-0 justify-center gap-1.5 overflow-x-auto overscroll-x-contain pt-1 max-sm:flex-nowrap max-sm:justify-start max-sm:snap-x max-sm:px-1 max-sm:pt-6 sm:flex-wrap"
          data-testid="player-hand"
        >
          {facesVisible && game.me && (
            <p className="sr-only">
              Your hand value is {game.roundResult?.lines.find((line) => line.playerId === game.me?.id)?.handValue ?? game.me.handValue}.
            </p>
          )}
          {hand.map((card) => {
            const isSelected = selected.includes(card.id);
            return (
              <div key={card.id} className="card-deal max-sm:snap-center">
                <PlayingCard
                  card={card}
                  selected={isSelected}
                  className={isSelected && !validation.valid ? "card-shake" : undefined}
                  onSelect={() => {
                    playSound("select");
                    setSelected((current) =>
                      current.includes(card.id)
                        ? current.filter((id) => id !== card.id)
                        : [...current, card.id],
                    );
                  }}
                />
              </div>
            );
          })}
        </div>
        {facesVisible && <HandValue playerId={game.me?.id ?? ""} game={game} facesVisible />}

        {actionError && !celebration.phase && (
          <p className="shrink-0 rounded-2xl border border-[var(--danger)] bg-black/50 px-3 py-2 text-sm text-[var(--danger)]">
            {actionError}
          </p>
        )}
        <ActionBar
          game={game}
          validation={
            selected.length === 0
              ? { valid: false, type: "INVALID", reason: "EMPTY_SELECTION", message: "Select at least one card." }
              : validation
          }
          selectedCount={selected.length}
          remainingValue={remainingValue}
          onPlay={() => void onAction({ type: "PLAY_CARDS", cardIds: selected })}
          onDraw={drawFromDeck}
          onTake={takeDiscardButton}
          onCaramba={() => setConfirmCaramba(true)}
          takeChoices={eligibleGroup?.cards.length ?? 0}
          choosingDiscard={choosingDiscard}
          takePending={pendingTakeId !== null}
        />
      </div>

      <aside className="hidden min-h-0 flex-col gap-2 overflow-y-auto lg:flex">
        <Scoreboard game={game} deferScores={deferScores} />
        <ChatPanel
          messages={game.chat}
          roomCode={game.roomCode}
          onSend={(text) => onAction({ type: "CHAT", text })}
        />
      </aside>

      {showBoard && (
        <MobileDrawer title="Scores" onClose={() => setShowBoard(false)}>
          <Scoreboard game={game} deferScores={deferScores} />
        </MobileDrawer>
      )}
      {showChat && (
        <MobileDrawer title="Chat" onClose={() => setShowChat(false)}>
          <ChatPanel
            messages={game.chat}
            roomCode={game.roomCode}
            onSend={(text) => onAction({ type: "CHAT", text })}
          />
        </MobileDrawer>
      )}

      {showdown === "announce" && game.roundResult && (
        <CarrambaAnnouncement caller={game.roundResult.callerNickname} reduceMotion={reduceMotion} />
      )}
      {showdown && showdown !== "announce" && game.roundResult && (
        <p className="sr-only" aria-live="polite">
          {game.roundResult.lines
            .map((line) => `${line.nickname} has ${line.handValue} in hand.`)
            .join(" ")}{" "}
          {showdown === "result" ? showdownAnnouncement(game.roundResult) : ""}
        </p>
      )}
      {showdown === "result" && game.roundResult && game.status !== "GAME_OVER" && (
        <RoundEndOverlay
          game={game}
          secondsLeft={secondsLeft}
          onNext={() => onAction({ type: "NEXT_ROUND" })}
        />
      )}
      {celebration.phase && (
        <WinnerCelebration
          game={game}
          phase={celebration.phase}
          reduceMotion={reduceMotion}
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
            setConfirmCaramba(false);
            await onAction({ type: "CALL_CARAMBA" });
          }}
        />
      )}
    </div>
  );
}

function HandValue({
  playerId,
  game,
  facesVisible,
}: {
  playerId: string;
  game: PublicGameState;
  facesVisible: boolean;
}) {
  const result = game.roundResult;
  if (!facesVisible || !result) {
    return null;
  }
  const line = result.lines.find((entry) => entry.playerId === playerId);
  if (!line) {
    return null;
  }
  const lowest = Math.min(...result.lines.map((entry) => entry.handValue));
  const isLowest = line.handValue === lowest;
  return (
    <p className={cn("text-center text-xs font-extrabold", isLowest ? "text-gold" : "text-cream")}>
      {line.handValue}
      {isLowest ? " lowest" : ""}
    </p>
  );
}

function DiscardPile({
  title,
  cards,
  selectable,
  emphasized,
  pendingId,
  onSelect,
}: {
  title: string;
  cards: Card[];
  selectable: boolean;
  emphasized: boolean;
  pendingId: string | null;
  onSelect: (cardId: string) => void;
}) {
  const locked = pendingId !== null;
  return (
    <div className="text-center" data-testid={selectable ? "eligible-discard" : undefined}>
      <div
        className={cn(
          "flex flex-wrap justify-center",
          selectable ? "gap-2" : "gap-1",
          emphasized && "rounded-2xl bg-gold/10 p-1 ring-2 ring-[var(--gold)]",
        )}
        role="group"
        aria-label={title}
      >
        {cards.map((card, index) => {
          const pending = pendingId === card.id;
          return (
            <div
              key={card.id}
              className="origin-bottom focus-within:z-10"
              style={{
                transform: `rotate(${(index - (cards.length - 1) / 2) * (selectable ? 3 : 5)}deg)`,
              }}
            >
              <PlayingCard
                card={card}
                eligible={selectable && !locked}
                pending={pending}
                selected={pending}
                accent="gold"
                disabled={locked}
                label={selectable ? `Take ${card.rank} of ${card.suit} from discard` : undefined}
                testId={selectable ? `take-card-${card.id}` : undefined}
                onSelect={selectable && !locked ? () => onSelect(card.id) : undefined}
                compact
                className={selectable ? "h-20 w-16 sm:h-20 sm:w-16" : undefined}
              />
            </div>
          );
        })}
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
    <div className="fixed inset-0 z-40 flex items-end bg-black/60 lg:hidden">
      <div className="pop-panel flex max-h-[min(70dvh,32rem)] w-full flex-col rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
