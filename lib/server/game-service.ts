import { playBotTurns } from "@/lib/game/bot-runner";
import { secureRandomInt } from "@/lib/game/deck";
import {
  addChatMessage,
  arrangeTestHands,
  assertGameMember,
  callCaramba,
  createInitialGame,
  drawFromDeck,
  GameEngineError,
  playCards,
  rematch as rematchGame,
  setPlayerConnected,
  startNextRound,
  takePreviousDiscard,
} from "@/lib/game/game-engine";
import { getPublicGameStateForPlayer } from "@/lib/game/projection";
import { GAME_RULES } from "@/lib/game/rules";
import { parseScoreSettings, readScoreRules } from "@/lib/game/score-settings";
import type { BotDifficulty, Card, GameMode, GameState, PublicGameState, RoomRecord } from "@/lib/game/types";
import { getStore, StaleVersionError, type RoomPlayer } from "@/lib/store";
import { generateRoomCode, isValidNickname, normalizeNickname, normalizeRoomCode } from "@/lib/utils/identity";
import { assertHost } from "./authorization";
import { HttpError } from "./errors";
import { withRoomLock } from "./mutex";
import { consumeRateLimit } from "./rate-limit";
import { settleMatch } from "./profiles";
import type { QueueEntry } from "@/lib/game/matchmaking";

function store() {
  return getStore();
}

async function publishRoom(code: string) {
  await store().publish(code);
}

function wrapEngine(error: unknown): never {
  if (error instanceof StaleVersionError) {
    throw new HttpError(
      "That move is no longer valid. The game state has changed.",
      409,
      "STALE_STATE",
    );
  }
  if (error instanceof GameEngineError) {
    throw new HttpError(error.message, 400, error.code);
  }
  throw error;
}

async function saveGame(game: GameState, expectedVersion: number) {
  try {
    await store().saveGame(game, expectedVersion);
  } catch (error) {
    wrapEngine(error);
  }
}

export async function createRoom(
  playerId: string,
  nickname: string,
  options?: { maxScore?: number; resetScore?: number; mode?: GameMode },
) {
  const name = normalizeNickname(nickname);
  if (!isValidNickname(name)) {
    throw new HttpError("Choose a nickname between 2 and 16 characters.");
  }
  const rules = scoreSettingsOrThrow(options?.maxScore, options?.resetScore);

  const now = Date.now();
  let code = generateRoomCode(secureRandomInt);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const existing = await store().getRoomByCode(code);
    if (!existing) {
      break;
    }
    code = generateRoomCode(secureRandomInt);
  }

  const room: RoomRecord = {
    id: crypto.randomUUID(),
    code,
    hostPlayerId: playerId,
    status: "LOBBY",
    maxPlayers: GAME_RULES.MAX_PLAYERS,
    maxScore: rules.maxScore,
    resetScore: rules.resetScore,
    mode: options?.mode ?? "private",
    gameId: null,
    createdAt: now,
    updatedAt: now,
  };
  const player: RoomPlayer = {
    id: playerId,
    roomId: room.id,
    nickname: name,
    seatIndex: 0,
    connected: true,
    ready: false,
    createdAt: now,
    updatedAt: now,
  };

  await store().saveRoom(room);
  await store().savePlayer(player);
  await publishRoom(code);
  return { room, player };
}

export async function joinRoom(playerId: string, nickname: string, rawCode: string) {
  const code = normalizeRoomCode(rawCode);
  const name = normalizeNickname(nickname);
  if (!isValidNickname(name)) {
    throw new HttpError("Choose a nickname between 2 and 16 characters.");
  }
  if (code.length !== GAME_RULES.ROOM_CODE_LENGTH) {
    throw new HttpError("Enter a valid 6-character room code.", 404, "ROOM_NOT_FOUND");
  }

  return withRoomLock(code, async () => {
    const room = await store().getRoomByCode(code);
    if (!room || room.status === "CLOSED") {
      throw new HttpError("That room was not found.", 404, "ROOM_NOT_FOUND");
    }
    if (room.status === "PLAYING") {
      const existing = (await store().listPlayers(room.id)).find(
        (player) => player.id === playerId,
      );
      if (existing) {
        const game = room.gameId ? await store().getGame(room.gameId) : null;
        return { room, player: existing, game };
      }
      throw new HttpError("This game has already started.", 409, "GAME_STARTED");
    }

    const players = await store().listPlayers(room.id);
    const existing = players.find((player) => player.id === playerId);
    if (existing) {
      const updated = {
        ...existing,
        nickname: name,
        connected: true,
        updatedAt: Date.now(),
      };
      await store().savePlayer(updated);
      await publishRoom(code);
      return { room, player: updated, game: null };
    }
    if (players.length >= room.maxPlayers) {
      throw new HttpError("This room is full.", 409, "ROOM_FULL");
    }

    const takenSeats = new Set(players.map((entry) => entry.seatIndex));
    let seatIndex = 0;
    while (takenSeats.has(seatIndex)) {
      seatIndex += 1;
    }
    const player: RoomPlayer = {
      id: playerId,
      roomId: room.id,
      nickname: name,
      seatIndex,
      connected: true,
      ready: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await store().savePlayer(player);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code === "23505") {
        throw new HttpError("That seat was just taken. Join again.", 409, "SEAT_TAKEN");
      }
      throw error;
    }
    await publishRoom(code);
    return { room, player, game: null };
  });
}

export async function getRoomSnapshot(code: string, viewerId: string | null) {
  const room = await store().getRoomByCode(normalizeRoomCode(code));
  if (!room || room.status === "CLOSED") {
    throw new HttpError("That room was not found.", 404, "ROOM_NOT_FOUND");
  }
  const players = await store().listPlayers(room.id);
  const game = room.gameId ? await store().getGame(room.gameId) : await store().getGameByRoomId(room.id);
  return {
    room,
    players,
    viewerId,
    game: game ? getPublicGameStateForPlayer(game, viewerId) : null,
  };
}

async function loadRoomContext(code: string) {
  const room = await store().getRoomByCode(normalizeRoomCode(code));
  if (!room || room.status === "CLOSED") {
    throw new HttpError("That room was not found.", 404, "ROOM_NOT_FOUND");
  }
  const players = await store().listPlayers(room.id);
  const game = room.gameId ? await store().getGame(room.gameId) : null;
  return { room, players, game };
}

export async function setReady(code: string, playerId: string, ready: boolean) {
  return withRoomLock(code, async () => {
    const { room, players, game } = await loadRoomContext(code);
    const player = players.find((entry) => entry.id === playerId);
    if (!player) {
      throw new HttpError("You are not in this room.");
    }
    await store().savePlayer({ ...player, ready, updatedAt: Date.now() });
    if (game) {
      const version = game.version;
      const next: GameState = {
        ...game,
        version: game.version + 1,
        players: game.players.map((entry) =>
          entry.id === playerId ? { ...entry, ready } : entry,
        ),
      };
      await saveGame(next, version);
    }
    await publishRoom(room.code);
    return getRoomSnapshot(room.code, playerId);
  });
}

export async function startGame(code: string, playerId: string) {
  return withRoomLock(code, async () => {
    const { room, players } = await loadRoomContext(code);
    assertHost(room, playerId, "Only the host can start the game.");
    if (players.length < GAME_RULES.MIN_PLAYERS) {
      throw new HttpError("At least 2 players are required to start.");
    }
    const unready = players.filter((player) => player.id !== playerId && !player.ready);
    if (unready.length > 0) {
      throw new HttpError("Every guest needs to be ready before you start.");
    }

    const previous = room.gameId ? await store().getGame(room.gameId) : null;
    let game = {
      ...createInitialGame({
        id: crypto.randomUUID(),
        roomId: room.id,
        roomCode: room.code,
        hostPlayerId: room.hostPlayerId,
        players: players.map((player) => ({
          id: player.id,
          nickname: player.nickname,
          seatIndex: player.seatIndex,
          connected: player.connected,
          ready: true,
        })),
        randomInt: secureRandomInt,
        maxScore: room.maxScore,
        resetScore: room.resetScore,
        mode: room.mode,
      }),
      chat: previous?.chat ?? [],
    };
    game = playBotTurns(game, secureRandomInt);

    await store().saveGame(game);
    await store().markRoomPlaying(room.id, game.id);
    await publishRoom(room.code);
    return getPublicGameStateForPlayer(game, playerId);
  });
}

async function leaveRoomUnlocked(code: string, playerId: string) {
  const { room, players, game } = await loadRoomContext(code);
  const remaining = players.filter((player) => player.id !== playerId);
  await store().removePlayer(playerId);

  if (remaining.length === 0) {
    await store().saveRoom({
      ...room,
      status: "CLOSED",
      hostPlayerId: "",
      updatedAt: Date.now(),
    });
    await publishRoom(room.code);
    return { left: true };
  }

  const hostPlayerId =
    room.hostPlayerId === playerId ? remaining[0]!.id : room.hostPlayerId;
  await store().saveRoom({ ...room, hostPlayerId, updatedAt: Date.now() });

  if (game && game.status !== "GAME_OVER") {
    const version = game.version;
    const next: GameState = {
      ...game,
      hostPlayerId,
      version: game.version + 1,
      players: game.players.map((player) =>
        player.id === playerId ? { ...player, connected: false } : player,
      ),
    };
    await saveGame(next, version);
  }
  await publishRoom(room.code);
  return { left: true };
}

export async function leaveRoom(code: string, playerId: string) {
  return withRoomLock(code, () => leaveRoomUnlocked(code, playerId));
}

export async function kickPlayer(code: string, hostId: string, targetId: string) {
  return withRoomLock(code, async () => {
    const { room } = await loadRoomContext(code);
    assertHost(room, hostId, "Only the host can remove a player.");
    if (targetId === hostId) {
      throw new HttpError("The host cannot remove themselves.");
    }
    return leaveRoomUnlocked(code, targetId);
  });
}

export async function closeRoom(code: string, hostId: string) {
  return withRoomLock(code, async () => {
    const { room, players } = await loadRoomContext(code);
    assertHost(room, hostId, "Only the host can close the room.");
    for (const player of players) {
      await store().removePlayer(player.id);
    }
    await store().saveRoom({
      ...room,
      status: "CLOSED",
      updatedAt: Date.now(),
    });
    await publishRoom(room.code);
    return { closed: true };
  });
}

export async function sendChat(code: string, playerId: string, text: string) {
  return withRoomLock(code, async () => {
    const { room, game, players } = await loadRoomContext(code);
    const player = players.find((entry) => entry.id === playerId);
    if (!player) {
      throw new HttpError("You are not in this room.");
    }
    if (!consumeRateLimit(playerId, "chat")) {
      throw new HttpError("You are sending messages too quickly.", 429, "RATE_LIMITED");
    }
    if (!game) {
      const lobbyGame: GameState = {
        id: `lobby-${room.id}`,
        roomId: room.id,
        roomCode: room.code,
        status: "LOBBY",
        players: players.map((entry) => ({
          id: entry.id,
          nickname: entry.nickname,
          seatIndex: entry.seatIndex,
          hand: [],
          totalScore: 0,
          lastRoundScore: null,
          eliminated: false,
          connected: entry.connected,
          ready: entry.ready,
        })),
        drawPile: [],
        discardHistory: [],
        currentPlayerId: null,
        turnPhase: "DISCARD",
        turnNumber: 0,
        roundNumber: 0,
        roundStarterId: null,
        version: 0,
        winnerId: null,
        lastDiscardGroupId: null,
        roundResult: null,
        nextRoundAt: null,
        events: [],
        chat: [],
        hostPlayerId: room.hostPlayerId,
        maxScore: room.maxScore,
        resetScore: room.resetScore,
        mode: room.mode,
        ratingApplied: false,
        ratingDeltas: null,
      };
      const withMessage = addChatMessage(lobbyGame, playerId, text);
      await store().saveGame({ ...withMessage, id: `lobby-${room.id}` });
      await store().saveRoom({ ...room, gameId: `lobby-${room.id}`, updatedAt: Date.now() });
      await publishRoom(room.code);
      return getPublicGameStateForPlayer(withMessage, playerId);
    }

    const version = game.version;
    const next = addChatMessage(game, playerId, text);
    await saveGame(next, version);
    await publishRoom(room.code);
    return getPublicGameStateForPlayer(next, playerId);
  });
}

async function mutateGame(
  code: string,
  playerId: string,
  mutator: (game: GameState) => GameState,
): Promise<PublicGameState> {
  return withRoomLock(code, async () => {
    const { room, game } = await loadRoomContext(code);
    if (!game || game.status === "LOBBY") {
      throw new HttpError("The game has not started yet.");
    }
    const version = game.version;
    try {
      let next = playBotTurns(mutator(game), secureRandomInt);
      next = await settleMatch(next);
      await saveGame(next, version);
      await store().saveRoom({
        ...room,
        status: next.status === "GAME_OVER" ? "PLAYING" : room.status,
        gameId: next.id,
        updatedAt: Date.now(),
      });
      await publishRoom(room.code);
      return getPublicGameStateForPlayer(next, playerId);
    } catch (error) {
      wrapEngine(error);
    }
  });
}

export function play(code: string, playerId: string, cardIds: string[]) {
  return mutateGame(code, playerId, (game) => playCards(game, playerId, cardIds));
}

export function draw(code: string, playerId: string) {
  return mutateGame(code, playerId, (game) => drawFromDeck(game, playerId, secureRandomInt));
}

export function takeDiscard(code: string, playerId: string, cardId: string) {
  return mutateGame(code, playerId, (game) => takePreviousDiscard(game, playerId, cardId));
}

export function caramba(code: string, playerId: string) {
  return mutateGame(code, playerId, (game) => callCaramba(game, playerId));
}

export function nextRound(code: string, playerId: string) {
  return mutateGame(code, playerId, (game) => {
    assertGameMember(game, playerId);
    return startNextRound(game, secureRandomInt);
  });
}

export async function rematch(code: string, playerId: string) {
  return withRoomLock(code, async () => {
    const { room, game, players } = await loadRoomContext(code);
    if (!game) {
      throw new HttpError("The game has not started yet.");
    }
    assertHost(room, playerId, "Only the host can start a rematch.");
    const next = rematchGame(
      {
        ...game,
        players: game.players.filter((player) =>
          players.some((entry) => entry.id === player.id),
        ),
      },
      secureRandomInt,
    );
    await store().saveRoom({
      ...room,
      status: "PLAYING",
      gameId: next.id,
      updatedAt: Date.now(),
    });
    await store().saveGame(next);
    await publishRoom(room.code);
    return getPublicGameStateForPlayer(next, playerId);
  });
}

export async function backToLobby(code: string, playerId: string) {
  return withRoomLock(code, async () => {
    const { room } = await loadRoomContext(code);
    assertHost(room, playerId, "Only the host can return the table to the lobby.");
    const players = await store().listPlayers(room.id);
    for (const player of players) {
      await store().savePlayer({ ...player, ready: false, updatedAt: Date.now() });
    }
    await store().saveRoom({
      ...room,
      status: "LOBBY",
      gameId: null,
      updatedAt: Date.now(),
    });
    await publishRoom(room.code);
    return getRoomSnapshot(room.code, playerId);
  });
}

export async function markConnected(code: string, playerId: string, connected: boolean) {
  return withRoomLock(code, async () => {
    try {
      const { room, players, game } = await loadRoomContext(code);
      const player = players.find((entry) => entry.id === playerId);
      if (!player) {
        return;
      }
      await store().savePlayer({ ...player, connected, updatedAt: Date.now() });
      if (game) {
        const next = setPlayerConnected(game, playerId, connected);
        if (next !== game) {
          await store().saveGame(next);
        }
      }
      await publishRoom(room.code);
    } catch {
      return;
    }
  });
}

export async function arrangeHands(
  code: string,
  playerId: string,
  hands: Record<string, Card[]>,
  drawPile?: Card[],
) {
  if (process.env.CARAMBA_TEST_MODE !== "1") {
    throw new HttpError("Test helpers are disabled.", 403, "FORBIDDEN");
  }
  return mutateGame(code, playerId, (game) => arrangeTestHands(game, hands, drawPile));
}

function scoreSettingsOrThrow(maxScore?: number, resetScore?: number) {
  const fallback = readScoreRules({});
  try {
    return parseScoreSettings(maxScore ?? fallback.maxScore, resetScore ?? fallback.resetScore);
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : "Invalid score settings.");
  }
}

export async function updateScoreSettings(
  code: string,
  playerId: string,
  maxScore: number,
  resetScore: number,
) {
  return withRoomLock(code, async () => {
    const { room } = await loadRoomContext(code);
    assertHost(room, playerId, "Only the host can change the score settings.");
    if (room.status !== "LOBBY") {
      throw new HttpError("Score settings lock when the game starts.");
    }
    const rules = scoreSettingsOrThrow(maxScore, resetScore);
    await store().saveRoom({
      ...room,
      maxScore: rules.maxScore,
      resetScore: rules.resetScore,
      updatedAt: Date.now(),
    });
    await publishRoom(room.code);
    return getRoomSnapshot(room.code, playerId);
  });
}

const BOT_NAMES = ["Nico", "Remy", "Sol"];

export async function createPracticeGame(
  playerId: string,
  nickname: string,
  difficulty: BotDifficulty,
  maxScore?: number,
  resetScore?: number,
) {
  const name = normalizeNickname(nickname);
  if (!isValidNickname(name)) {
    throw new HttpError("Choose a nickname between 2 and 16 characters.");
  }
  const rules = scoreSettingsOrThrow(maxScore, resetScore);
  const now = Date.now();
  const room: RoomRecord = {
    id: crypto.randomUUID(),
    code: generateRoomCode(secureRandomInt),
    hostPlayerId: playerId,
    status: "PLAYING",
    maxPlayers: 4,
    maxScore: rules.maxScore,
    resetScore: rules.resetScore,
    mode: "practice",
    gameId: null,
    createdAt: now,
    updatedAt: now,
  };
  const seats = [
    { id: playerId, nickname: name, isBot: false as const },
    ...BOT_NAMES.map((botName) => ({
      id: crypto.randomUUID(),
      nickname: `${botName} · Bot`,
      isBot: true as const,
    })),
  ];
  await store().saveRoom(room);
  for (const [index, seat] of seats.entries()) {
    await store().savePlayer({
      id: seat.id,
      roomId: room.id,
      nickname: seat.nickname,
      seatIndex: index,
      connected: true,
      ready: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  let game = createInitialGame({
    id: crypto.randomUUID(),
    roomId: room.id,
    roomCode: room.code,
    hostPlayerId: playerId,
    maxScore: rules.maxScore,
    resetScore: rules.resetScore,
    mode: "practice",
    randomInt: secureRandomInt,
    players: seats.map((seat, index) => ({
      id: seat.id,
      nickname: seat.nickname,
      seatIndex: index,
      connected: true,
      ready: true,
      isBot: seat.isBot,
      botDifficulty: seat.isBot ? difficulty : undefined,
    })),
  });
  game = playBotTurns(game, secureRandomInt);
  await store().saveGame(game);
  await store().saveRoom({ ...room, gameId: game.id, updatedAt: Date.now() });
  await publishRoom(room.code);
  return { code: room.code, game: getPublicGameStateForPlayer(game, playerId) };
}

export async function createMatchedRoom(entries: QueueEntry[]) {
  if (entries.length < 2 || entries.length > GAME_RULES.MAX_PLAYERS) {
    throw new HttpError("A match needs between 2 and 8 players.");
  }
  const host = entries[0];
  if (!host) {
    throw new HttpError("A match needs between 2 and 8 players.");
  }
  const now = Date.now();
  const room: RoomRecord = {
    id: crypto.randomUUID(),
    code: generateRoomCode(secureRandomInt),
    hostPlayerId: host.playerId,
    status: "PLAYING",
    maxPlayers: GAME_RULES.MAX_PLAYERS,
    maxScore: 100,
    resetScore: 50,
    mode: host.mode,
    gameId: null,
    createdAt: now,
    updatedAt: now,
  };
  await store().saveRoom(room);
  for (const [index, entry] of entries.entries()) {
    const nickname = normalizeNickname(entry.nickname).slice(0, 16);
    await store().savePlayer({
      id: entry.playerId,
      roomId: room.id,
      nickname: isValidNickname(nickname) ? nickname : `Player ${index + 1}`,
      seatIndex: index,
      connected: true,
      ready: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  const game = createInitialGame({
    id: crypto.randomUUID(),
    roomId: room.id,
    roomCode: room.code,
    hostPlayerId: host.playerId,
    maxScore: 100,
    resetScore: 50,
    mode: host.mode,
    randomInt: secureRandomInt,
    players: entries.map((entry, index) => ({
      id: entry.playerId,
      nickname: normalizeNickname(entry.nickname).slice(0, 16) || `Player ${index + 1}`,
      seatIndex: index,
      connected: true,
      ready: true,
      userId: entry.userId,
    })),
  });
  await store().saveGame(game);
  await store().saveRoom({ ...room, gameId: game.id, updatedAt: Date.now() });
  await publishRoom(room.code);
  return room.code;
}

export function isTestMode() {
  return process.env.CARAMBA_TEST_MODE === "1";
}
