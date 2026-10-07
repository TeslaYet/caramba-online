import { rememberStripeEvent, setServerEntitlement } from "@/lib/server/profiles";
import { stripeGet, subscriptionPeriodEnd, verifyStripeSignature } from "@/lib/server/stripe";

export const POST = async (request: Request) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }
  let event: {
    id?: string;
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return Response.json({ error: "Invalid event." }, { status: 400 });
  }
  if (!event.id || !event.type || !event.data?.object) {
    return Response.json({ error: "Invalid event." }, { status: 400 });
  }

  const object = event.data.object;
  const metadata = (object.metadata ?? {}) as { user_id?: string };
  if (event.type === "checkout.session.completed") {
    const userId = String(object.client_reference_id || metadata.user_id || "");
    const customer = typeof object.customer === "string" ? object.customer : null;
    const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
    if (userId && subscriptionId) {
      const subscription = await stripeGet(`subscriptions/${subscriptionId}`);
      const periodEnd = subscriptionPeriodEnd(subscription);
      await setServerEntitlement({
        userId,
        entitlement: "PREMIUM",
        source: "stripe",
        expiresAt: Number.isFinite(periodEnd) ? new Date(periodEnd * 1000).toISOString() : null,
        stripeCustomerId: customer,
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const metadata = (object.metadata ?? {}) as { user_id?: string };
    const userId = metadata.user_id;
    const status = String(object.status ?? "");
    const customer = typeof object.customer === "string" ? object.customer : null;
    const periodEnd = subscriptionPeriodEnd(object);
    if (userId) {
      const active = status === "active" || status === "trialing";
      await setServerEntitlement({
        userId,
        entitlement: active ? "PREMIUM" : "FREE",
        source: "stripe",
        expiresAt: active && Number.isFinite(periodEnd) ? new Date(periodEnd * 1000).toISOString() : null,
        stripeCustomerId: customer,
      });
    }
  }

  const fresh = await rememberStripeEvent(event.id);
  return Response.json({ received: true, duplicate: !fresh });
};
