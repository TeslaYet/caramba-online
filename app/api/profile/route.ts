import { z } from "zod";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { publicProfile, updatePublicProfile } from "@/lib/server/profiles";

const schema = z.object({
  displayName: z.string().min(2).max(24),
  avatarUrl: z.string().max(300).nullable().optional(),
});

export const PATCH = withApi(async (request) => {
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in to edit your profile.", 401);
  }
  const body = await readJson(request, schema);
  try {
    const profile = await updatePublicProfile(user.id, {
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
    });
    return privateJson({ profile: publicProfile(profile) });
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : "Could not update the profile.");
  }
});
