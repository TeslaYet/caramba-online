import { createHmac, timingSafeEqual } from "node:crypto";

export function billingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_ID,
  );
}

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured.");
  }
  return key;
}

export async function stripeForm(
  path: string,
  body: URLSearchParams,
): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof payload.error === "object" && payload.error && "message" in payload.error
        ? String((payload.error as { message?: string }).message)
        : "Stripe request failed.";
    throw new Error(message);
  }
  return payload;
}

export async function stripeGet(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error("Stripe request failed.");
  }
  return payload;
}

export function subscriptionPeriodEnd(subscription: Record<string, unknown>): number {
  if (typeof subscription.current_period_end === "number") {
    return subscription.current_period_end;
  }
  const items = subscription.items as { data?: { current_period_end?: number }[] } | undefined;
  const nested = items?.data?.[0]?.current_period_end;
  return typeof nested === "number" ? nested : Number.NaN;
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) {
    return false;
  }
  const parts = header.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) {
    return false;
  }
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const left = Buffer.from(expected);
  return signatures.some((signature) => {
    const right = Buffer.from(signature);
    return left.length === right.length && timingSafeEqual(left, right);
  });
}
