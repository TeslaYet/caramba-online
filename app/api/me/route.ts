import { privateJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { getProfile, incomingRequests, publicProfile } from "@/lib/server/profiles";
import { canShowAds } from "@/lib/ui/entitlements";

export const GET = withApi(async (request) => {
  const user = await readAuthUser(request);
  if (!user) {
    return privateJson({ profile: null, showAds: true, requests: [] });
  }
  const profile = await getProfile(user.id);
  return privateJson({
    email: user.email,
    profile: profile ? publicProfile(profile) : null,
    showAds: canShowAds(profile?.entitlement),
    requests: profile
      ? (await incomingRequests(user.id)).map((request) => ({
          username: request.username,
          displayName: request.displayName,
        }))
      : [],
  });
});
