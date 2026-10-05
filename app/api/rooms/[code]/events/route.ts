import { getStore } from "@/lib/store";
import { getPlayerId } from "@/lib/server/session";
import { getRoomSnapshot, markConnected } from "@/lib/server/game-service";

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
      const send = async () => {
        if (closed) {
          return;
        }
        try {
          const snapshot = await getRoomSnapshot(code, playerId);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`),
          );
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "ROOM_CLOSED" })}\n\n`),
          );
        }
      };

      const unsubscribe = getStore().subscribe(code, () => {
        void send();
      });

      void send();
      if (playerId) {
        void markConnected(code, playerId, true);
      }

      const heartbeat = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        }
      }, 15000);

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        if (playerId) {
          void markConnected(code, playerId, false);
        }
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
