import { privateJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { cancelQueue } from "@/lib/server/match-queue";

export const POST = withApi(async (request) => {
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in to leave matchmaking.", 401);
  }
  await cancelQueue(user.id);
  return privateJson({ status: "idle" });
});
