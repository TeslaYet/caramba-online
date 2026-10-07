import { z } from "zod";
import { privateJson, rememberName, readJson, withApi } from "@/lib/server/api";
import { HttpError } from "@/lib/server/errors";
import { joinRoom } from "@/lib/server/game-service";
import { clientIp, consumeRateLimit } from "@/lib/server/rate-limit";

const schema = z.object({
  nickname: z.string().min(2).max(16),
  code: z.string().min(4).max(12),
});

export const POST = withApi(async (request, playerId) => {
  if (!consumeRateLimit(clientIp(request), "room-join")) {
    throw new HttpError("Too many join attempts. Try again later.", 429, "RATE_LIMITED");
  }
  const { nickname, code } = await readJson(request, schema);
  await rememberName(nickname);
  const result = await joinRoom(playerId, nickname, code);
  return privateJson({
    room: result.room,
    player: result.player,
    gameId: result.game?.id ?? result.room.gameId,
  });
});
