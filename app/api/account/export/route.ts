import { privateJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { exportAccount } from "@/lib/server/profiles";

export const GET = withApi(async (request) => {
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in to export your account data.", 401);
  }
  return privateJson(await exportAccount(user.id));
});
