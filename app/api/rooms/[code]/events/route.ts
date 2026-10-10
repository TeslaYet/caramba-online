import { getStore } from "@/lib/store";
import { getPlayerId } from "@/lib/server/session";
import { getRoomSnapshot, markConnected } from "@/lib/server/game-service";
import { openPresence } from "@/lib/server/presence";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const playerId = await getPlayerId();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let sending = false;
      let queued = false;
      let lastSignature = "";

      const send = async () => {
        if (closed) {
          return;
        }
        if (sending) {
          queued = true;
          return;
        }
        sending = true;
        try {
          do {
            queued = false;
            const snapshot = await getRoomSnapshot(code, playerId);
            const signature = [
              snapshot.game?.version ?? "none",
              snapshot.room.updatedAt,
              snapshot.room.status,
              snapshot.room.format ?? "individual",
              snapshot.room.maxPlayers,
              ...snapshot.players.map(
                (player) =>
                  `${player.id}:${player.connected}:${player.ready}:${player.teamId ?? ""}:${player.seatIndex}`,
              ),
            ].join("|");
            if (signature === lastSignature) {
              continue;
            }
            lastSignature = signature;
            if (!closed) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
            }
          } while (queued && !closed);
        } catch {
          if (!closed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "ROOM_CLOSED" })}\n\n`));
          }
        } finally {
          sending = false;
        }
      };

      const unsubscribe = getStore().subscribe(code, () => {
        void send();
      });
      const releasePresence = playerId
        ? openPresence(code, playerId, (connected, notBefore) => {
            void markConnected(code, playerId, connected, notBefore);
          })
        : () => undefined;

      void send();

      const heartbeat = setInterval(() => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(`: ping\n\n`));
        void send();
      }, 15000);

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        releasePresence();
        controller.close();
      };

      _request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
