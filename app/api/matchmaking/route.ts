import { z } from "zod";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { createMatchedRoom } from "@/lib/server/game-service";
import { attachMatchCode, enqueuePlayer, heartbeat, queueStatus, releaseClaim, takeMatch } from "@/lib/server/match-queue";
import { getProfile } from "@/lib/server/profiles";
import { consumeRateLimit } from "@/lib/server/rate-limit";

const schema = z.object({
  mode: z.enum(["casual", "ranked"]),
});

async function form(mode: "casual" | "ranked") {
  const claimed = await takeMatch(mode);
  if (!claimed) {
    return null;
  }
  try {
    const code = await createMatchedRoom(claimed);
    await attachMatchCode(
      claimed.map((entry) => entry.id),
      claimed.map((entry) => entry.userId),
      code,
    );
    return { code, players: claimed.length };
  } catch (error) {
    await releaseClaim(claimed.map((entry) => entry.id));
    throw error;
  }
}

export const GET = withApi(async (request, playerId) => {
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in to join matchmaking.", 401);
  }
  const status = await queueStatus(user.id);
  if (status.matchCode) {
    return privateJson({ status: "matched", code: status.matchCode, playersFound: 0 });
  }
  if (!status.mode) {
    return privateJson({ status: "idle", playersFound: 0 });
  }
  const playersFound = await heartbeat(user.id, status.mode);
  const formed = await form(status.mode);
  if (formed) {
    const mine = await queueStatus(user.id);
    return privateJson({
      status: mine.matchCode ? "matched" : "waiting",
      code: mine.matchCode,
      playersFound: formed.players,
    });
  }
  return privateJson({ status: "waiting", playersFound, playerId });
});

export const POST = withApi(async (request, playerId) => {
  if (!consumeRateLimit(playerId, "action")) {
    throw new HttpError("Too many queue requests.", 429, "RATE_LIMITED");
  }
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in to join matchmaking.", 401);
  }
  const profile = await getProfile(user.id);
  if (!profile) {
    throw new HttpError("Your profile is not ready yet.", 401);
  }
  const { mode } = await readJson(request, schema);
  const queued = await enqueuePlayer({
    id: crypto.randomUUID(),
    userId: user.id,
    playerId,
    nickname: profile.displayName,
    mode,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
  });
  const formed = await form(mode);
  if (formed) {
    const mine = await queueStatus(user.id);
    if (mine.matchCode) {
      return privateJson({
        status: "matched",
        code: mine.matchCode,
        playersFound: formed.players,
        duplicate: queued.duplicate,
      });
    }
  }
  return privateJson({
    status: "waiting",
    playersFound: queued.waiting,
    duplicate: queued.duplicate,
  });
});
