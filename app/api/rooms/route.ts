import { z } from "zod";
import { rememberName, readJson, withApi } from "@/lib/server/api";
import { createRoom } from "@/lib/server/game-service";

const schema = z.object({
  nickname: z.string().min(2).max(16),
});

export const POST = withApi(async (request, playerId) => {
  const { nickname } = await readJson(request, schema);
  await rememberName(nickname);
  const result = await createRoom(playerId, nickname);
  return Response.json({
    room: result.room,
    player: result.player,
  });
});
