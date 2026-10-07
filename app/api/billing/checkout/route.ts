import { privateJson, withApi } from "@/lib/server/api";
import { readAuthUser } from "@/lib/server/auth-user";
import { HttpError } from "@/lib/server/errors";
import { getProfile } from "@/lib/server/profiles";
import { billingConfigured, stripeForm } from "@/lib/server/stripe";

export const POST = withApi(async (request) => {
  const user = await readAuthUser(request);
  if (!user) {
    throw new HttpError("Sign in before subscribing.", 401);
  }
  if (!billingConfigured()) {
    throw new HttpError("Subscriptions are not configured yet.", 503);
  }
  const profile = await getProfile(user.id);
  if (!profile) {
    throw new HttpError("Your profile is not ready yet.", 401);
  }
  const origin = new URL(request.url).origin;
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": process.env.STRIPE_PRICE_ID ?? "",
    "line_items[0][quantity]": "1",
    success_url: `${origin}/premium?checkout=success`,
    cancel_url: `${origin}/premium?checkout=cancel`,
    client_reference_id: user.id,
    "metadata[user_id]": user.id,
    "subscription_data[metadata][user_id]": user.id,
  });
  if (profile.stripeCustomerId) {
    body.set("customer", profile.stripeCustomerId);
  } else if (user.email) {
    body.set("customer_email", user.email);
  }
  if (process.env.STRIPE_AUTOMATIC_TAX === "1") {
    body.set("automatic_tax[enabled]", "true");
  }
  const session = await stripeForm("checkout/sessions", body);
  return privateJson({ url: session.url });
});
