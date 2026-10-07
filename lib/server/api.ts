import { z } from "zod";
import { errorResponse, HttpError } from "./errors";
import { ensurePlayerId, persistNickname } from "./session";

const MAX_BODY_CHARS = 16_000;
const EXTRA_ORIGINS = new Set([
  "https://carramba.online",
  "https://www.carramba.online",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new HttpError("Cross-site request blocked.", 403, "FORBIDDEN");
    }
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (originHost !== host && !EXTRA_ORIGINS.has(origin)) {
      throw new HttpError("Cross-site request blocked.", 403, "FORBIDDEN");
    }
    return;
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError("Cross-site request blocked.", 403, "FORBIDDEN");
  }
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    throw new HttpError("Request is too large.", 413, "PAYLOAD_TOO_LARGE");
  }
  let body: unknown = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError("Invalid request.");
    }
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  return parsed.data;
}

export function privateJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

export function withApi(
  handler: (request: Request, playerId: string) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
      assertSameOrigin(request);
      const playerId = await ensurePlayerId();
      return await handler(request, playerId);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function rememberName(nickname: string) {
  await persistNickname(nickname);
}
