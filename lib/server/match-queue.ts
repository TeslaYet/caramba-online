import { claimMatch, claimSolo, joinQueue, leaveQueue, pruneQueue, touchQueue, type QueueEntry, type QueueMode } from "@/lib/game/matchmaking";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

const memory: QueueEntry[] = [];
const memoryCodes = new Map<string, string>();

function rowToEntry(row: Record<string, unknown>): QueueEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    playerId: String(row.player_id),
    nickname: String(row.nickname),
    mode: row.mode as QueueMode,
    playerCount: Number.isInteger(row.player_count) ? Number(row.player_count) : undefined,
    joinedAt: new Date(String(row.joined_at)).getTime(),
    lastSeenAt: new Date(String(row.last_seen_at)).getTime(),
  };
}

export async function enqueuePlayer(entry: QueueEntry): Promise<{ duplicate: boolean; waiting: number }> {
  if (!isSupabaseConfigured()) {
    const pruned = pruneQueue(memory, Date.now());
    memory.splice(0, memory.length, ...pruned);
    memoryCodes.delete(entry.userId);
    const result = joinQueue(memory, entry);
    memory.splice(0, memory.length, ...result.entries);
    if (result.duplicate) {
      const index = memory.findIndex((item) => item.userId === entry.userId);
      const current = memory[index];
      if (current) {
        memory[index] = {
          ...current,
          mode: entry.mode,
          playerCount: entry.playerCount,
          lastSeenAt: Date.now(),
        };
      }
    }
    const waiting = memory.filter(
      (item) => item.mode === entry.mode && item.playerCount === entry.playerCount,
    ).length;
    return { duplicate: result.duplicate, waiting };
  }

  const client = createAdminClient();
  await dropStale();
  const existing = await client
    .from("match_queue")
    .select("*")
    .eq("user_id", entry.userId)
    .eq("status", "waiting")
    .maybeSingle();
  if (existing.error) {
    throw existing.error;
  }
  if (existing.data) {
    await client
      .from("match_queue")
      .update({
        last_seen_at: new Date().toISOString(),
        mode: entry.mode,
        player_count: entry.playerCount ?? null,
      })
      .eq("id", existing.data.id);
    const count = await waitingCount(entry.mode, entry.playerCount);
    return { duplicate: true, waiting: count };
  }
  const inserted = await client.from("match_queue").insert({
    id: entry.id,
    user_id: entry.userId,
    player_id: entry.playerId,
    nickname: entry.nickname,
    mode: entry.mode,
    player_count: entry.playerCount ?? null,
    status: "waiting",
  });
  if (inserted.error && inserted.error.code !== "23505") {
    throw inserted.error;
  }
  return {
    duplicate: inserted.error?.code === "23505",
    waiting: await waitingCount(entry.mode, entry.playerCount),
  };
}

export async function heartbeat(
  userId: string,
  mode: QueueMode,
  playerCount?: number | null,
): Promise<number> {
  if (!isSupabaseConfigured()) {
    const next = touchQueue(pruneQueue(memory, Date.now()), userId, Date.now());
    memory.splice(0, memory.length, ...next);
    return memory.filter(
      (item) => item.mode === mode && (playerCount == null || item.playerCount === playerCount),
    ).length;
  }
  const client = createAdminClient();
  await dropStale();
  await client
    .from("match_queue")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "waiting");
  return waitingCount(mode, playerCount);
}

export async function cancelQueue(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const next = leaveQueue(memory, userId);
    memory.splice(0, memory.length, ...next);
    return;
  }
  const { error } = await createAdminClient()
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "waiting");
  if (error) {
    throw error;
  }
}

export async function queueStatus(userId: string): Promise<{
  waiting: number;
  matchCode: string | null;
  mode: QueueMode | null;
  playerCount: number | null;
}> {
  if (!isSupabaseConfigured()) {
    const mine = memory.find((entry) => entry.userId === userId);
    if (mine) {
      return {
        waiting: memory.filter(
          (entry) => entry.mode === mine.mode && entry.playerCount === mine.playerCount,
        ).length,
        matchCode: null,
        mode: mine.mode,
        playerCount: mine.playerCount ?? null,
      };
    }
    const code = memoryCodes.get(userId);
    if (code) {
      return { waiting: 0, matchCode: code, mode: null, playerCount: null };
    }
    return { waiting: 0, matchCode: null, mode: null, playerCount: null };
  }
  const { data, error } = await createAdminClient()
    .from("match_queue")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["waiting", "matched"])
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data || (data.status !== "waiting" && data.status !== "matched")) {
    return { waiting: 0, matchCode: null, mode: null, playerCount: null };
  }
  const age = Date.now() - new Date(String(data.joined_at)).getTime();
  const playerCount = Number.isInteger(data.player_count) ? Number(data.player_count) : null;
  if (data.status === "matched") {
    if (!data.match_code || age > 120_000) {
      return { waiting: 0, matchCode: null, mode: null, playerCount: null };
    }
    return {
      waiting: 0,
      matchCode: String(data.match_code),
      mode: data.mode as QueueMode,
      playerCount,
    };
  }
  const mode = data.mode as QueueMode;
  return {
    waiting: await waitingCount(mode, playerCount),
    matchCode: null,
    mode,
    playerCount,
  };
}

export async function takeMatch(mode: QueueMode): Promise<QueueEntry[] | null> {
  if (!isSupabaseConfigured()) {
    const pruned = pruneQueue(memory, Date.now());
    const claimed = claimMatch(pruned, mode, Date.now());
    memory.splice(0, memory.length, ...(claimed?.rest ?? pruned));
    return claimed?.claimed ?? null;
  }

  const client = createAdminClient();
  await dropStale();
  const { data, error } = await client
    .from("match_queue")
    .select("*")
    .eq("mode", mode)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true })
    .limit(64);
  if (error) {
    throw error;
  }
  const waiting = (data ?? []).map((row) => rowToEntry(row));
  const decision = claimMatch(waiting, mode, Date.now());
  if (!decision) {
    return null;
  }
  const ids = decision.claimed.map((entry) => entry.id);
  const updated = await client
    .from("match_queue")
    .update({ status: "matched" })
    .in("id", ids)
    .eq("status", "waiting")
    .select("*");
  if (updated.error) {
    throw updated.error;
  }
  const claimed = (updated.data ?? []).map((row) => rowToEntry(row));
  if (claimed.length !== decision.claimed.length) {
    if (claimed.length > 0) {
      await client.from("match_queue").update({ status: "waiting" }).in(
        "id",
        claimed.map((entry) => entry.id),
      );
    }
    return null;
  }
  return claimed;
}

export async function takeSolo(mode: QueueMode): Promise<QueueEntry | null> {
  if (mode !== "casual") {
    return null;
  }
  if (!isSupabaseConfigured()) {
    const pruned = pruneQueue(memory, Date.now());
    const decision = claimSolo(pruned, mode, Date.now());
    memory.splice(0, memory.length, ...(decision?.rest ?? pruned));
    return decision?.solo ?? null;
  }

  const client = createAdminClient();
  await dropStale();
  const { data, error } = await client
    .from("match_queue")
    .select("*")
    .eq("mode", mode)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true })
    .limit(2);
  if (error) {
    throw error;
  }
  const waiting = (data ?? []).map((row) => rowToEntry(row));
  const decision = claimSolo(waiting, mode, Date.now());
  if (!decision) {
    return null;
  }
  const updated = await client
    .from("match_queue")
    .update({ status: "matched" })
    .eq("id", decision.solo.id)
    .eq("status", "waiting")
    .select("*");
  if (updated.error) {
    throw updated.error;
  }
  const claimed = (updated.data ?? []).map((row) => rowToEntry(row))[0];
  if (!claimed) {
    return null;
  }
  if ((await waitingCount(mode)) > 0) {
    await client.from("match_queue").update({ status: "waiting" }).eq("id", claimed.id);
    return null;
  }
  return claimed;
}

export async function attachMatchCode(ids: string[], userIds: string[], code: string) {
  if (!isSupabaseConfigured()) {
    for (const userId of userIds) {
      memoryCodes.set(userId, code);
    }
    return;
  }
  const { error } = await createAdminClient()
    .from("match_queue")
    .update({ match_code: code })
    .in("id", ids);
  if (error) {
    throw error;
  }
}

export async function releaseClaim(ids: string[]) {
  if (!isSupabaseConfigured() || ids.length === 0) {
    return;
  }
  await createAdminClient().from("match_queue").update({ status: "waiting", match_code: null }).in("id", ids);
}

async function dropStale() {
  if (!isSupabaseConfigured()) {
    return;
  }
  const stale = new Date(Date.now() - 20_000).toISOString();
  await createAdminClient().from("match_queue").delete().eq("status", "waiting").lt("last_seen_at", stale);
}

async function waitingCount(mode: QueueMode, playerCount?: number | null): Promise<number> {
  let query = createAdminClient()
    .from("match_queue")
    .select("id", { count: "exact", head: true })
    .eq("mode", mode)
    .eq("status", "waiting");
  if (playerCount != null) {
    query = query.eq("player_count", playerCount);
  }
  const { count, error } = await query;
  if (error) {
    throw error;
  }
  return count ?? 0;
}
