import { getPlayerId } from "@/lib/server/session";
import { errorResponse } from "@/lib/server/errors";
import { getRoomSnapshot } from "@/lib/server/game-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const playerId = await getPlayerId();
    const snapshot = await getRoomSnapshot(code, playerId);
    return Response.json(snapshot, {
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
