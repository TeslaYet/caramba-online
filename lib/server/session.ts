import { cookies } from "next/headers";

export const PLAYER_COOKIE = "caramba_pid";
export const NICKNAME_COOKIE = "caramba_name";

export async function getPlayerId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(PLAYER_COOKIE)?.value ?? null;
}

export async function requirePlayerId(): Promise<string> {
  const playerId = await getPlayerId();
  if (!playerId) {
    throw new SessionError("Join or create a room first.");
  }
  return playerId;
}

export async function ensurePlayerId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(PLAYER_COOKIE)?.value;
  if (existing) {
    return existing;
  }
  const playerId = crypto.randomUUID();
  jar.set(PLAYER_COOKIE, playerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return playerId;
}

export async function persistNickname(nickname: string): Promise<void> {
  const jar = await cookies();
  jar.set(NICKNAME_COOKIE, nickname, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}
