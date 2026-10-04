import { z } from "zod";
import { rememberName, readJson, withApi } from "@/lib/server/api";
import { joinRoom } from "@/lib/server/game-service";

const schema = z.object({
  nickname: z.string().min(2).max(16),
  code: z.string().min(4).max(12),
});

export const POST = withApi(async (request, playerId) => {
  const { nickname, code } = await readJson(request, schema);
  await rememberName(nickname);
  const result = await joinRoom(playerId, nickname, code);
  return Response.json({
    room: result.room,
    player: result.player,
    gameId: result.game?.id ?? result.room.gameId,
  });
});
