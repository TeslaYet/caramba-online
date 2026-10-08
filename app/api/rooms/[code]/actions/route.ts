import { z } from "zod";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { HttpError } from "@/lib/server/errors";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import {
  backToLobby,
  caramba,
  closeRoom,
  draw,
  kickPlayer,
  leaveRoom,
  nextRound,
  play,
  rematch,
  sendChat,
  setReady,
  startGame,
  takeDiscard,
  updateScoreSettings,
} from "@/lib/server/game-service";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("READY") }),
  z.object({ type: z.literal("UNREADY") }),
  z.object({ type: z.literal("START") }),
  z.object({ type: z.literal("LEAVE") }),
  z.object({ type: z.literal("KICK"), playerId: z.string() }),
  z.object({ type: z.literal("CLOSE") }),
  z.object({ type: z.literal("CHAT"), text: z.string().min(1).max(240) }),
  z.object({ type: z.literal("PLAY_CARDS"), cardIds: z.array(z.string()).min(1).max(5) }),
  z.object({ type: z.literal("DRAW_FROM_DECK") }),
  z.object({
    type: z.literal("TAKE_FROM_PREVIOUS_DISCARD"),
    cardId: z.string().min(1),
  }),
  z.object({ type: z.literal("CALL_CARAMBA") }),
  z.object({ type: z.literal("NEXT_ROUND") }),
  z.object({ type: z.literal("REMATCH") }),
  z.object({ type: z.literal("BACK_TO_LOBBY") }),
  z.object({
    type: z.literal("UPDATE_SETTINGS"),
    maxScore: z.number().int(),
    resetScore: z.number().int(),
  }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  return withApi(async (incoming, playerId) => {
    if (!consumeRateLimit(playerId, "action")) {
      throw new HttpError("Too many actions. Slow down.", 429, "RATE_LIMITED");
    }
    const action = await readJson(incoming, schema);
    switch (action.type) {
      case "READY":
        return privateJson(await setReady(code, playerId, true));
      case "UNREADY":
        return privateJson(await setReady(code, playerId, false));
      case "START":
        return privateJson(await startGame(code, playerId));
      case "LEAVE":
        return privateJson(await leaveRoom(code, playerId));
      case "KICK":
        return privateJson(await kickPlayer(code, playerId, action.playerId));
      case "CLOSE":
        return privateJson(await closeRoom(code, playerId));
      case "CHAT":
        return privateJson(await sendChat(code, playerId, action.text));
      case "PLAY_CARDS":
        return privateJson(await play(code, playerId, action.cardIds));
      case "DRAW_FROM_DECK":
        return privateJson(await draw(code, playerId));
      case "TAKE_FROM_PREVIOUS_DISCARD":
        return privateJson(await takeDiscard(code, playerId, action.cardId));
      case "CALL_CARAMBA":
        return privateJson(await caramba(code, playerId));
      case "NEXT_ROUND":
        return privateJson(await nextRound(code, playerId));
      case "REMATCH":
        return privateJson(await rematch(code, playerId));
      case "BACK_TO_LOBBY":
        return privateJson(await backToLobby(code, playerId));
      case "UPDATE_SETTINGS":
        return privateJson(
          await updateScoreSettings(code, playerId, action.maxScore, action.resetScore),
        );
    }
  })(request);
}
