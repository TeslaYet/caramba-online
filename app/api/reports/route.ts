import { z } from "zod";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { saveAbuseReport } from "@/lib/server/profiles";
import { consumeRateLimit } from "@/lib/server/rate-limit";

const schema = z.object({
  roomCode: z.string().min(4).max(12),
  messageId: z.string().min(1).max(80),
  excerpt: z.string().min(1).max(240),
  reason: z.string().min(2).max(500),
});

export const POST = withApi(async (request, playerId) => {
  if (!consumeRateLimit(playerId, "chat")) {
    throw new HttpError("Too many reports. Try again later.", 429, "RATE_LIMITED");
  }
  const body = await readJson(request, schema);
  const user = await readAuthUser(request);
  await saveAbuseReport({
    reporterUserId: user?.id ?? null,
    roomCode: body.roomCode.toUpperCase(),
    messageId: body.messageId,
    excerpt: body.excerpt,
    reason: body.reason,
  });
  return privateJson({ received: true });
});
