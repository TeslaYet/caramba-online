import { z } from "zod";
import { readJson, withApi } from "@/lib/server/api";
import { arrangeHands, isTestMode } from "@/lib/server/game-service";
import { HttpError } from "@/lib/server/errors";
import { SUITS, RANKS } from "@/lib/game/types";

const cardSchema = z.object({
  id: z.string(),
  rank: z.enum(RANKS),
  suit: z.enum(SUITS),
  color: z.enum(["red", "black"]),
});

const schema = z.object({
  code: z.string(),
  hands: z.record(z.string(), z.array(cardSchema)),
  drawPile: z.array(cardSchema).optional(),
});

export const POST = withApi(async (request, playerId) => {
  if (!isTestMode()) {
    throw new HttpError("Test helpers are disabled.", 403, "FORBIDDEN");
  }
  const body = await readJson(request, schema);
  const game = await arrangeHands(body.code, playerId, body.hands, body.drawPile);
  return Response.json({ game });
});
