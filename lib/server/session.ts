import { cookies } from "next/headers";
import { readSession, signSession } from "./session-token";

export const PLAYER_COOKIE = "caramba_pid";
export const NICKNAME_COOKIE = "caramba_name";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.CARAMBA_COOKIE_SECURE === "0" ? false : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function getPlayerId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(PLAYER_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return readSession(token);
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
  const playerId = existing ? readSession(existing) : null;
  if (playerId) {
    return playerId;
  }
  const nextId = crypto.randomUUID();
  jar.set(PLAYER_COOKIE, signSession(nextId), cookieOptions());
  return nextId;
}

export async function persistNickname(nickname: string): Promise<void> {
  const jar = await cookies();
  jar.set(NICKNAME_COOKIE, nickname, {
    ...cookieOptions(),
    httpOnly: false,
  });
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}
