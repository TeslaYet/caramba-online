import { ranking } from "@/lib/game/turn-manager";
import {
  rateMatch,
  recordsMatchStats,
  shouldAdjustRating,
  STARTING_RATING,
} from "@/lib/game/rating";
import type { GameState, PublicRatingDelta } from "@/lib/game/types";
import { canShowAds, keepManualGrant, type Entitlement } from "@/lib/ui/entitlements";
import { rankTitle } from "@/lib/ui/ranks";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  gamesPlayed: number;
  wins: number;
  rating: number;
  entitlement: Entitlement;
  entitlementSource: "default" | "manual" | "stripe";
  entitlementExpiresAt: string | null;
  stripeCustomerId: string | null;
}

const memoryProfiles = new Map<string, Profile>();
const memoryResults = new Set<string>();
const memoryFriends = new Map<string, { requesterId: string; addresseeId: string; status: "pending" | "accepted" }>();

function friendKey(a: string, b: string) {
  return `${a}:${b}`;
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    gamesPlayed: Number(row.games_played),
    wins: Number(row.wins),
    rating: Number(row.rating),
    entitlement: row.entitlement as Entitlement,
    entitlementSource: (row.entitlement_source as Profile["entitlementSource"]) ?? "default",
    entitlementExpiresAt: row.entitlement_expires_at ? String(row.entitlement_expires_at) : null,
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null,
  };
}

export function publicProfile(profile: Profile) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    gamesPlayed: profile.gamesPlayed,
    wins: profile.wins,
    rating: profile.rating,
    entitlement: profile.entitlement,
    entitlementSource: profile.entitlementSource,
    entitlementExpiresAt: profile.entitlementExpiresAt,
    rank: rankTitle(profile.rating),
    showAds: canShowAds(profile.entitlement),
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return memoryProfiles.get(userId) ?? null;
  }
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? mapProfile(data) : null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const clean = username.trim().toLowerCase();
  if (!isSupabaseConfigured()) {
    return [...memoryProfiles.values()].find((profile) => profile.username === clean) ?? null;
  }
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("username", clean)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? mapProfile(data) : null;
}

export function rememberMemoryProfile(profile: Profile) {
  memoryProfiles.set(profile.id, profile);
}

export async function updatePublicProfile(
  userId: string,
  input: { displayName?: string; avatarUrl?: string | null },
): Promise<Profile> {
  const current = await getProfile(userId);
  if (!current) {
    throw new Error("Create an account before editing a profile.");
  }
  const displayName = input.displayName === undefined ? current.displayName : input.displayName.trim();
  if (displayName.length < 2 || displayName.length > 24) {
    throw new Error("Display name must be 2 to 24 characters.");
  }
  let avatarUrl = input.avatarUrl === undefined ? current.avatarUrl : input.avatarUrl;
  if (avatarUrl === "") {
    avatarUrl = null;
  }
  if (avatarUrl && !/^https:\/\//.test(avatarUrl)) {
    throw new Error("Avatar must be an https link.");
  }
  const next = { ...current, displayName, avatarUrl };
  if (!isSupabaseConfigured()) {
    memoryProfiles.set(userId, next);
    return next;
  }
  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    throw error;
  }
  return next;
}

export async function listLeaderboard(limit = 50): Promise<Profile[]> {
  if (!isSupabaseConfigured()) {
    return [...memoryProfiles.values()]
      .sort((a, b) => b.rating - a.rating || b.wins - a.wins)
      .slice(0, limit);
  }
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("*")
    .order("rating", { ascending: false })
    .order("wins", { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => mapProfile(row));
}

export async function friendIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [...memoryFriends.values()]
      .filter(
        (row) =>
          row.status === "accepted" && (row.requesterId === userId || row.addresseeId === userId),
      )
      .map((row) => (row.requesterId === userId ? row.addresseeId : row.requesterId));
  }
  const client = createAdminClient();
  const { data, error } = await client
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) =>
    row.requester_id === userId ? String(row.addressee_id) : String(row.requester_id),
  );
}

export async function requestFriend(userId: string, username: string) {
  const other = await getProfileByUsername(username);
  if (!other || other.id === userId) {
    throw new Error("That player was not found.");
  }
  if (!isSupabaseConfigured()) {
    memoryFriends.set(friendKey(userId, other.id), {
      requesterId: userId,
      addresseeId: other.id,
      status: "pending",
    });
    return;
  }
  const { error } = await createAdminClient().from("friendships").insert({
    requester_id: userId,
    addressee_id: other.id,
    status: "pending",
  });
  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function acceptFriend(userId: string, username: string) {
  const other = await getProfileByUsername(username);
  if (!other) {
    throw new Error("That player was not found.");
  }
  if (!isSupabaseConfigured()) {
    const row = memoryFriends.get(friendKey(other.id, userId));
    if (!row || row.status !== "pending") {
      throw new Error("There is no friend request to accept.");
    }
    row.status = "accepted";
    return;
  }
  const { data, error } = await createAdminClient()
    .from("friendships")
    .update({ status: "accepted" })
    .eq("requester_id", other.id)
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .select("requester_id");
  if (error) {
    throw error;
  }
  if (!data?.length) {
    throw new Error("There is no friend request to accept.");
  }
}

export async function incomingRequests(userId: string): Promise<Profile[]> {
  if (!isSupabaseConfigured()) {
    const ids = [...memoryFriends.values()]
      .filter((row) => row.addresseeId === userId && row.status === "pending")
      .map((row) => row.requesterId);
    return ids.map((id) => memoryProfiles.get(id)).filter((profile): profile is Profile => Boolean(profile));
  }
  const { data, error } = await createAdminClient()
    .from("friendships")
    .select("requester_id")
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error) {
    throw error;
  }
  const profiles = await Promise.all((data ?? []).map((row) => getProfile(String(row.requester_id))));
  return profiles.filter((profile): profile is Profile => Boolean(profile));
}

async function loadProfile(userId: string): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) {
    return existing;
  }
  const created: Profile = {
    id: userId,
    username: `player_${userId.slice(0, 8)}`,
    displayName: "Player",
    avatarUrl: null,
    gamesPlayed: 0,
    wins: 0,
    rating: STARTING_RATING,
    entitlement: "FREE",
    entitlementSource: "default",
    entitlementExpiresAt: null,
    stripeCustomerId: null,
  };
  memoryProfiles.set(userId, created);
  return created;
}

export async function settleMatch(game: GameState): Promise<GameState> {
  if (game.status !== "GAME_OVER" || game.ratingApplied || !recordsMatchStats(game.mode)) {
    return game;
  }

  const ordered = ranking(game.players);
  let place = 0;
  let seen = 0;
  let lastKey = "";
  const seated = ordered.flatMap((player) => {
    seen += 1;
    const key = `${player.eliminated}:${player.totalScore}`;
    if (key !== lastKey) {
      place = seen;
      lastKey = key;
    }
    if (!player.userId || player.isBot) {
      return [];
    }
    return [{ player, place }];
  });

  if (seated.length === 0) {
    return { ...game, ratingApplied: true, ratingDeltas: [] };
  }

  const profiles = await Promise.all(seated.map((row) => loadProfile(row.player.userId!)));
  const rated = shouldAdjustRating(game.mode)
    ? rateMatch(
        seated.map((row, index) => ({
          id: row.player.id,
          rating: profiles[index]?.rating ?? STARTING_RATING,
          place: row.place,
        })),
      )
    : seated.map((row, index) => ({
        id: row.player.id,
        before: profiles[index]?.rating ?? STARTING_RATING,
        after: profiles[index]?.rating ?? STARTING_RATING,
        delta: 0,
      }));

  const deltas: PublicRatingDelta[] = [];
  for (let index = 0; index < seated.length; index += 1) {
    const seat = seated[index];
    const change = rated[index];
    const profile = profiles[index];
    if (!seat || !change || !profile || !seat.player.userId) {
      continue;
    }
    const key = `${game.id}:${seat.player.userId}`;
    const applied = await writeResult({
      key,
      gameId: game.id,
      userId: seat.player.userId,
      mode: game.mode,
      placement: seat.place,
      before: change.before,
      after: change.after,
      delta: change.delta,
      gamesPlayed: profile.gamesPlayed + 1,
      wins: profile.wins + (seat.place === 1 ? 1 : 0),
      adjustRating: shouldAdjustRating(game.mode),
    });
    if (applied) {
      deltas.push({
        playerId: seat.player.id,
        before: change.before,
        after: change.after,
        delta: change.delta,
      });
    }
  }

  return {
    ...game,
    ratingApplied: true,
    ratingDeltas: shouldAdjustRating(game.mode) ? deltas : null,
  };
}

async function writeResult(input: {
  key: string;
  gameId: string;
  userId: string;
  mode: string;
  placement: number;
  before: number;
  after: number;
  delta: number;
  gamesPlayed: number;
  wins: number;
  adjustRating: boolean;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    if (memoryResults.has(input.key)) {
      return false;
    }
    memoryResults.add(input.key);
    const profile = memoryProfiles.get(input.userId);
    if (profile) {
      memoryProfiles.set(input.userId, {
        ...profile,
        gamesPlayed: input.gamesPlayed,
        wins: input.wins,
        rating: input.adjustRating ? input.after : profile.rating,
      });
    }
    return true;
  }

  const client = createAdminClient();
  const { error } = await client.from("match_results").insert({
    game_id: input.gameId,
    user_id: input.userId,
    mode: input.mode,
    placement: input.placement,
    rating_before: input.before,
    rating_after: input.adjustRating ? input.after : input.before,
    delta: input.adjustRating ? input.delta : 0,
  });
  if (error?.code === "23505") {
    return false;
  }
  if (error) {
    throw error;
  }
  const patch: Record<string, number | string> = {
    games_played: input.gamesPlayed,
    wins: input.wins,
    updated_at: new Date().toISOString(),
  };
  if (input.adjustRating) {
    patch.rating = input.after;
  }
  const updated = await client.from("profiles").update(patch).eq("id", input.userId);
  if (updated.error) {
    throw updated.error;
  }
  return true;
}

export async function setServerEntitlement(input: {
  userId: string;
  entitlement: Entitlement;
  source: Profile["entitlementSource"];
  expiresAt: string | null;
  stripeCustomerId?: string | null;
}): Promise<void> {
  const current = await getProfile(input.userId);
  if (keepManualGrant(current?.entitlementSource, input.source, input.entitlement)) {
    return;
  }
  if (!isSupabaseConfigured()) {
    const profile = memoryProfiles.get(input.userId);
    if (!profile) {
      return;
    }
    memoryProfiles.set(input.userId, {
      ...profile,
      entitlement: input.entitlement,
      entitlementSource: input.source,
      entitlementExpiresAt: input.expiresAt,
      stripeCustomerId: input.stripeCustomerId ?? profile.stripeCustomerId,
    });
    return;
  }
  const patch: Record<string, string | null> = {
    entitlement: input.entitlement,
    entitlement_source: input.source,
    entitlement_expires_at: input.expiresAt,
    updated_at: new Date().toISOString(),
  };
  if (input.stripeCustomerId) {
    patch.stripe_customer_id = input.stripeCustomerId;
  }
  const { error } = await createAdminClient().from("profiles").update(patch).eq("id", input.userId);
  if (error) {
    throw error;
  }
}

export async function recordConsent(userId: string, advertising: boolean, policyVersion: string) {
  if (!isSupabaseConfigured()) {
    return;
  }
  const { error } = await createAdminClient().from("consent_records").insert({
    user_id: userId,
    advertising,
    policy_version: policyVersion,
  });
  if (error) {
    throw error;
  }
}

export async function exportAccount(userId: string) {
  const profile = await getProfile(userId);
  if (!isSupabaseConfigured()) {
    return {
      profile: profile ? publicProfile(profile) : null,
      results: [],
      friendships: [],
      consent: [],
      note: "Table nicknames typed in a private game are not linked to this account.",
    };
  }
  const client = createAdminClient();
  const [results, friends, consent] = await Promise.all([
    client.from("match_results").select("game_id, mode, placement, delta, created_at").eq("user_id", userId),
    client
      .from("friendships")
      .select("requester_id, addressee_id, status, created_at")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    client.from("consent_records").select("advertising, policy_version, created_at").eq("user_id", userId),
  ]);
  return {
    profile: profile ? publicProfile(profile) : null,
    results: results.data ?? [],
    friendships: friends.data ?? [],
    consent: consent.data ?? [],
    note: "Table nicknames and chat lines stay inside each game record. They are not copied here because a private-table nickname is not the account.",
  };
}

export async function anonymizeAccount(userId: string): Promise<void> {
  const stamp = userId.replace(/-/g, "").slice(0, 8);
  const username = `deleted_${stamp}`;
  if (!isSupabaseConfigured()) {
    const profile = memoryProfiles.get(userId);
    if (profile) {
      memoryProfiles.set(userId, {
        ...profile,
        username,
        displayName: "Deleted Player",
        avatarUrl: null,
      });
    }
    return;
  }
  const client = createAdminClient();
  const { error } = await client
    .from("profiles")
    .update({
      username,
      display_name: "Deleted Player",
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    throw error;
  }
  await client.from("friendships").delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  await client.from("match_queue").delete().eq("user_id", userId);
  await client.from("consent_records").delete().eq("user_id", userId);
}

export async function saveAbuseReport(input: {
  reporterUserId: string | null;
  roomCode: string;
  messageId: string;
  excerpt: string;
  reason: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }
  const { error } = await createAdminClient().from("abuse_reports").insert({
    reporter_user_id: input.reporterUserId,
    room_code: input.roomCode,
    message_id: input.messageId,
    excerpt: input.excerpt.slice(0, 240),
    reason: input.reason.slice(0, 500),
  });
  if (error) {
    throw error;
  }
}

export async function rememberStripeEvent(eventId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true;
  }
  const { error } = await createAdminClient().from("stripe_events").insert({ id: eventId });
  if (error?.code === "23505") {
    return false;
  }
  if (error) {
    throw error;
  }
  return true;
}
