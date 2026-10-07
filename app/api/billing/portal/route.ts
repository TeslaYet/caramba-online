import { privateJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { getProfile } from "@/lib/server/profiles";
import { billingConfigured, stripeForm } from "@/lib/server/stripe";

export const POST = withApi(async (request) => {
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in to manage billing.", 401);
  }
  if (!billingConfigured()) {
    throw new HttpError("Subscriptions are not configured yet.", 503);
  }
  const profile = await getProfile(user.id);
  if (!profile?.stripeCustomerId) {
    throw new HttpError("No Stripe subscription is linked to this account yet.");
  }
  const origin = new URL(request.url).origin;
  const session = await stripeForm(
    "billing_portal/sessions",
    new URLSearchParams({
      customer: profile.stripeCustomerId,
      return_url: `${origin}/premium`,
    }),
  );
  return privateJson({ url: session.url });
});
