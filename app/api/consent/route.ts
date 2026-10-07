import { z } from "zod";
import { CONSENT_VERSION } from "@/lib/ui/consent";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { recordConsent } from "@/lib/server/profiles";

const schema = z.object({
  advertising: z.boolean(),
});

export const POST = withApi(async (request) => {
  const body = await readJson(request, schema);
  const user = await readAuthUser(request);
  if (user) {
    await recordConsent(user.id, body.advertising, CONSENT_VERSION);
  }
  return privateJson({ saved: Boolean(user), version: CONSENT_VERSION });
});
