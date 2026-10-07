import type { RoomRecord } from "@/lib/game/types";
import { HttpError } from "./errors";

export function assertHost(
  room: Pick<RoomRecord, "hostPlayerId">,
  actorId: string,
  message = "Only the host can do that.",
): void {
  if (room.hostPlayerId !== actorId) {
    throw new HttpError(message, 403, "FORBIDDEN");
  }
}
