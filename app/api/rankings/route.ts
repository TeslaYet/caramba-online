import { privateJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { friendIds, listLeaderboard, publicProfile } from "@/lib/server/profiles";

export const GET = withApi(async (request) => {
  const scope = new URL(request.url).searchParams.get("scope");
  const user = await readAuthUser(request);
  const rows = await listLeaderboard(100);
  let list = rows;
  if (scope === "friends") {
    if (!user) {
      list = [];
    } else {
      const ids = new Set([user.id, ...(await friendIds(user.id))]);
      list = rows.filter((profile) => ids.has(profile.id));
    }
  }
  return privateJson({
    rankings: list.map((profile) => ({
      ...publicProfile(profile),
      rank: rows.findIndex((row) => row.id === profile.id) + 1,
    })),
  });
});
