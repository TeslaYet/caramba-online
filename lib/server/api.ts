import { z } from "zod";
import { errorResponse, HttpError } from "./errors";
import { ensurePlayerId, persistNickname } from "./session";

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  return parsed.data;
}

export function withApi(
  handler: (request: Request, playerId: string) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
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
