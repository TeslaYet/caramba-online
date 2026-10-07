import { createHmac, timingSafeEqual, createHash } from "node:crypto";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function sessionKey(): Buffer {
  const dedicated = process.env.CARAMBA_SESSION_SECRET;
  const fallback = process.env.CARAMBA_DB_SECRET;
  const material = dedicated || fallback;
  if (!material) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CARAMBA_SESSION_SECRET is not configured.");
    }
    return createHash("sha256").update("carramba-dev-session").digest();
  }
  return createHash("sha256").update(`carramba-session-v1:${material}`).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", sessionKey()).update(payload).digest("base64url");
}

export function signSession(playerId: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ id: playerId, exp: now + SESSION_TTL_MS }),
    "utf8",
  ).toString("base64url");
  return `v1.${payload}.${sign(payload)}`;
}

export function readSession(token: string, now = Date.now()): string | null {
  const [version, payload, mac] = token.split(".");
  if (version !== "v1" || !payload || !mac) {
    return null;
  }
  const expected = sign(payload);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      id?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.id !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (!/^[0-9a-f-]{36}$/i.test(parsed.id) || parsed.exp < now) {
      return null;
    }
    return parsed.id;
  } catch {
    return null;
  }
}
