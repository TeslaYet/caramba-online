import { z } from "zod";
import { readJson, withApi } from "@/lib/server/api";
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
    cardId: z.string(),
  }),
  z.object({ type: z.literal("CALL_CARAMBA") }),
  z.object({ type: z.literal("NEXT_ROUND") }),
  z.object({ type: z.literal("REMATCH") }),
  z.object({ type: z.literal("BACK_TO_LOBBY") }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  return withApi(async (incoming, playerId) => {
    const action = await readJson(incoming, schema);
    switch (action.type) {
      case "READY":
        return Response.json(await setReady(code, playerId, true));
      case "UNREADY":
        return Response.json(await setReady(code, playerId, false));
      case "START":
        return Response.json(await startGame(code, playerId));
      case "LEAVE":
        return Response.json(await leaveRoom(code, playerId));
      case "KICK":
        return Response.json(await kickPlayer(code, playerId, action.playerId));
      case "CLOSE":
        return Response.json(await closeRoom(code, playerId));
      case "CHAT":
        return Response.json(await sendChat(code, playerId, action.text));
      case "PLAY_CARDS":
        return Response.json(await play(code, playerId, action.cardIds));
      case "DRAW_FROM_DECK":
        return Response.json(await draw(code, playerId));
      case "TAKE_FROM_PREVIOUS_DISCARD":
        return Response.json(await takeDiscard(code, playerId, action.cardId));
      case "CALL_CARAMBA":
        return Response.json(await caramba(code, playerId));
      case "NEXT_ROUND":
        return Response.json(await nextRound(code, playerId));
      case "REMATCH":
        return Response.json(await rematch(code, playerId));
      case "BACK_TO_LOBBY":
        return Response.json(await backToLobby(code, playerId));
    }
  })(request);
}
