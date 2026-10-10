import { z } from "zod";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { createMatchedRoom } from "@/lib/server/game-service";
import { attachMatchCode, enqueuePlayer, heartbeat, queueStatus, releaseClaim, takeMatch, takeSolo } from "@/lib/server/match-queue";
import { getProfile } from "@/lib/server/profiles";
import { consumeRateLimit } from "@/lib/server/rate-limit";

const schema = z.object({
  mode: z.enum(["casual", "ranked"]),
  playerCount: z.number().int().min(2).max(8).optional(),
});

async function form(mode: "casual" | "ranked") {
  const claimed = await takeMatch(mode);
  if (claimed) {
    return openRoom(claimed, false);
  }
  const solo = await takeSolo(mode);
  if (solo) {
    return openRoom([solo], true);
  }
  return null;
}

async function openRoom(players: Parameters<typeof createMatchedRoom>[0], bot: boolean) {
  try {
    const code = await createMatchedRoom(players, { bot });
    await attachMatchCode(
      players.map((entry) => entry.id),
      players.map((entry) => entry.userId),
      code,
    );
    return { code, players: players.length + (bot ? 1 : 0) };
  } catch (error) {
    await releaseClaim(players.map((entry) => entry.id));
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
  const playersFound = await heartbeat(user.id, status.mode, status.playerCount);
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
  const { mode, playerCount } = await readJson(request, schema);
  if (mode === "ranked" && !playerCount) {
    throw new HttpError("Choose a ranked game size from 2 to 8 players.");
  }
  const queued = await enqueuePlayer({
    id: crypto.randomUUID(),
    userId: user.id,
    playerId,
    nickname: profile.displayName,
    mode,
    playerCount: mode === "ranked" ? playerCount : undefined,
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
