import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { privateJson, readJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { anonymizeAccount } from "@/lib/server/profiles";

const schema = z.object({
  confirm: z.literal("DELETE"),
});

export const POST = withApi(async (request) => {
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in to delete your account.", 401);
  }
  await readJson(request, schema);
  await anonymizeAccount(user.id);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let authCleared = false;
  if (url && serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const banned = await admin.auth.admin.updateUserById(user.id, {
      ban_duration: "876000h",
    });
    authCleared = !banned.error;
  }

  return privateJson({
    anonymized: true,
    authCleared,
    note: authCleared
      ? "The public profile is now Deleted Player and sign-in for this account is blocked."
      : "The public profile is now Deleted Player. The login email remains until SUPABASE_SERVICE_ROLE_KEY is configured.",
  });
});
