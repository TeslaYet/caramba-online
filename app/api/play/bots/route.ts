import { z } from "zod";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { HttpError } from "@/lib/server/errors";
import { createPracticeGame } from "@/lib/server/game-service";
import { clientIp, consumeRateLimit } from "@/lib/server/rate-limit";

const schema = z.object({
  nickname: z.string().min(2).max(16),
  difficulty: z.enum(["easy", "normal", "hard", "expert"]),
  maxScore: z.number().int().optional(),
  resetScore: z.number().int().optional(),
});

export const POST = withApi(async (request, playerId) => {
  if (!consumeRateLimit(clientIp(request), "room-create")) {
    throw new HttpError("Too many practice games. Try again later.", 429, "RATE_LIMITED");
  }
  const body = await readJson(request, schema);
  const result = await createPracticeGame(
    playerId,
    body.nickname,
    body.difficulty,
    body.maxScore,
    body.resetScore,
  );
  return privateJson(result);
});
