import { getStore } from "@/lib/store";
import { getPublicGameStateForPlayer } from "@/lib/game/projection";
import { errorResponse, HttpError } from "@/lib/server/errors";
import { getPlayerId } from "@/lib/server/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const playerId = await getPlayerId();
    const game = await getStore().getGame(id);
    if (!game) {
      throw new HttpError("That game was not found.", 404, "NOT_FOUND");
    }
    return Response.json({
      game: getPublicGameStateForPlayer(game, playerId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
