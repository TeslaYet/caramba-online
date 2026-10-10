import type { Card, GameLogEvent, Rank, Suit } from "./types";

export type CommentaryPriority = "low" | "normal" | "high" | "critical";

export type CommentaryLine = {
  id: string;
  sequence: number;
  timestamp: number;
  key: string;
  params: Record<string, string | number>;
  text: string;
  priority: CommentaryPriority;
  cards: Card[];
  playerId: string | null;
};

const SUIT_MARK: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const WINDOW = 24;

export function cardMark(card: Pick<Card, "rank" | "suit">): string {
  return `${card.rank}${SUIT_MARK[card.suit]}`;
}

function nameOf(players: Map<string, string>, id: string | null | undefined): string {
  if (!id) {
    return "Someone";
  }
  return players.get(id) ?? "Someone";
}

function readCard(value: unknown): Card | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const card = value as Partial<Card>;
  if (
    typeof card.id !== "string" ||
    typeof card.rank !== "string" ||
    typeof card.suit !== "string" ||
    (card.color !== "red" && card.color !== "black")
  ) {
    return null;
  }
  if (!(card.suit in SUIT_MARK)) {
    return null;
  }
  return {
    id: card.id,
    rank: card.rank as Rank,
    suit: card.suit as Suit,
    color: card.color,
  };
}

function readCards(value: unknown): Card[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const card = readCard(item);
    return card ? [card] : [];
  });
}

function line(
  event: GameLogEvent,
  key: string,
  params: Record<string, string | number>,
  text: string,
  priority: CommentaryPriority,
  cards: Card[] = [],
  suffix = "",
): CommentaryLine {
  return {
    id: suffix ? `${event.id}:${suffix}` : event.id,
    sequence: event.sequenceNumber,
    timestamp: event.timestamp,
    key,
    params,
    text,
    priority,
    cards,
    playerId: event.actorPlayerId,
  };
}

function describe(event: GameLogEvent, players: Map<string, string>): CommentaryLine[] {
  const actor = nameOf(players, event.actorPlayerId);
  if (event.type === "ROUND_STARTED") {
    const round = Number(event.payload.roundNumber) || 1;
    return [
      line(event, "round_started", { round }, `Round ${round} started.`, "low"),
    ];
  }
  if (event.type === "PLAYER_PLAYED") {
    const cards = readCards(event.payload.cards);
    const marks = cards.map(cardMark).join(" ");
    const text = marks ? `${actor} discarded ${marks}.` : `${actor} discarded.`;
    return [
      line(
        event,
        "player_discarded",
        { playerName: actor, cards: marks, count: cards.length },
        text,
        "normal",
        cards,
      ),
    ];
  }
  if (event.type === "PLAYER_DREW") {
    return [
      line(
        event,
        "player_drew_deck",
        { playerName: actor },
        `${actor} drew from the deck.`,
        "normal",
      ),
    ];
  }
  if (event.type === "PLAYER_TOOK_DISCARD") {
    const card = readCard(event.payload.card);
    const fromId = typeof event.payload.fromPlayerId === "string" ? event.payload.fromPlayerId : null;
    const previous = fromId ? nameOf(players, fromId) : "";
    const mark = card ? cardMark(card) : "";
    if (card && previous && previous !== "Someone") {
      return [
        line(
          event,
          "player_took_discard",
          { playerName: actor, card: mark, previousPlayerName: previous },
          `${actor} took the ${mark} from ${previous}'s discard.`,
          "normal",
          [card],
        ),
      ];
    }
    if (card) {
      return [
        line(
          event,
          "player_took_discard",
          { playerName: actor, card: mark, previousPlayerName: previous },
          `${actor} took the ${mark} from the discard.`,
          "normal",
          [card],
        ),
      ];
    }
    return [
      line(
        event,
        "player_took_discard",
        { playerName: actor, card: "", previousPlayerName: previous },
        previous && previous !== "Someone"
          ? `${actor} took a card from ${previous}'s discard.`
          : `${actor} took a card from the discard.`,
        "normal",
      ),
    ];
  }
  if (event.type === "TURN_STARTED") {
    return [
      line(event, "turn_started", { playerName: actor }, `${actor}'s turn.`, "low"),
    ];
  }
  if (event.type === "CARAMBA_CALLED") {
    const success = event.payload.success === true;
    return [
      line(
        event,
        "caramba_called",
        { playerName: actor },
        `${actor} called CARAMBA!`,
        "high",
      ),
      line(
        event,
        success ? "caramba_success" : "caramba_failed",
        { playerName: actor },
        success ? `${actor}'s CARAMBA was successful!` : `${actor}'s CARAMBA failed!`,
        "high",
        [],
        "result",
      ),
    ];
  }
  if (event.type === "ROUND_SCORED") {
    const round = Number(event.payload.roundNumber) || 1;
    return [line(event, "round_ended", { round }, `Round ${round} ended.`, "low")];
  }
  if (event.type === "PLAYER_ELIMINATED") {
    const remaining = Number(event.payload.remaining);
    const text =
      Number.isFinite(remaining) && remaining > 1
        ? `${actor} was eliminated. ${remaining} players remain.`
        : `${actor} was eliminated.`;
    return [
      line(
        event,
        "player_eliminated",
        { playerName: actor, remaining: Number.isFinite(remaining) ? remaining : "" },
        text,
        "high",
      ),
    ];
  }
  if (event.type === "GAME_FINISHED") {
    const winnerId =
      typeof event.payload.winnerId === "string" ? event.payload.winnerId : event.actorPlayerId;
    const winner = nameOf(players, winnerId);
    if (winnerId && winner !== "Someone") {
      return [line(event, "game_won", { playerName: winner }, `${winner} wins!`, "critical")];
    }
    return [line(event, "game_over", {}, "Game over.", "critical")];
  }
  return [];
}

export function commentaryFromEvents(
  events: GameLogEvent[],
  players: Array<{ id: string; nickname: string }>,
): CommentaryLine[] {
  const names = new Map(players.map((player) => [player.id, player.nickname]));
  const ordered = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const seen = new Set<string>();
  const lines: CommentaryLine[] = [];
  for (const event of ordered.slice(-WINDOW)) {
    if (seen.has(event.id)) {
      continue;
    }
    seen.add(event.id);
    lines.push(...describe(event, names));
  }
  return lines;
}
