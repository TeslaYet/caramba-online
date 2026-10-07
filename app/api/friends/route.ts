import { z } from "zod";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { acceptFriend, requestFriend } from "@/lib/server/profiles";

const schema = z.object({
  username: z.string().min(2).max(16),
  accept: z.boolean().optional(),
});

export const POST = withApi(async (request) => {
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in to add a friend.", 401);
  }
  const body = await readJson(request, schema);
  try {
    if (body.accept) {
      await acceptFriend(user.id, body.username);
    } else {
      await requestFriend(user.id, body.username);
    }
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : "Could not update friends.");
  }
  return privateJson({ ok: true });
});
