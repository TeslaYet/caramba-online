import { z } from "zod";
import { privateJson, rememberName, readJson, withApi } from "@/lib/server/api";
import { createRoom } from "@/lib/server/game-service";
import { HttpError } from "@/lib/server/errors";
import { clientIp, consumeRateLimit } from "@/lib/server/rate-limit";

const schema = z.object({
  nickname: z.string().min(2).max(16),
  maxScore: z.number().int().optional(),
  resetScore: z.number().int().optional(),
});

export const POST = withApi(async (request, playerId) => {
  if (!consumeRateLimit(clientIp(request), "room-create")) {
    throw new HttpError("Too many rooms created. Try again later.", 429, "RATE_LIMITED");
  }
  const { nickname, maxScore, resetScore } = await readJson(request, schema);
  await rememberName(nickname);
  const result = await createRoom(playerId, nickname, { maxScore, resetScore, mode: "private" });
  return privateJson({
    room: result.room,
    player: result.player,
  });
});
