import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { keepManualGrant } from "@/lib/ui/entitlements";
import { adsScriptAllowed, isAdSenseClientId, parseConsent, CONSENT_VERSION } from "@/lib/ui/consent";
import { subscriptionPeriodEnd, verifyStripeSignature } from "@/lib/server/stripe";

describe("advertising consent", () => {
  it("does not load a third-party ad script without a real publisher id and an accept choice", () => {
    expect(isAdSenseClientId("ca-pub-not-real")).toBe(false);
    expect(
      adsScriptAllowed({
        showAds: true,
        consent: { version: CONSENT_VERSION, advertising: true, decidedAt: 1 },
        clientId: undefined,
        slotId: undefined,
      }),
    ).toBe(false);
    expect(
      adsScriptAllowed({
        showAds: true,
        consent: null,
        clientId: "ca-pub-1234567890",
        slotId: "1234567890",
      }),
    ).toBe(false);
    expect(
      adsScriptAllowed({
        showAds: true,
        consent: { version: CONSENT_VERSION, advertising: false, decidedAt: 1 },
        clientId: "ca-pub-1234567890",
        slotId: "1234567890",
      }),
    ).toBe(false);
    expect(
      adsScriptAllowed({
        showAds: false,
        consent: { version: CONSENT_VERSION, advertising: true, decidedAt: 1 },
        clientId: "ca-pub-1234567890",
        slotId: "1234567890",
      }),
    ).toBe(false);
    expect(
      adsScriptAllowed({
        showAds: true,
        consent: { version: CONSENT_VERSION, advertising: true, decidedAt: 1 },
        clientId: "ca-pub-1234567890",
        slotId: "1234567890",
      }),
    ).toBe(true);
  });

  it("ignores a stored choice from an older policy version", () => {
    expect(parseConsent(JSON.stringify({ version: "old", advertising: true, decidedAt: 1 }))).toBeNull();
  });
});

describe("billing guards", () => {
  it("keeps a manual ad-free grant when a Stripe subscription ends", () => {
    expect(keepManualGrant("manual", "stripe", "FREE")).toBe(true);
    expect(keepManualGrant("stripe", "stripe", "FREE")).toBe(false);
    expect(keepManualGrant("manual", "stripe", "PREMIUM")).toBe(false);
  });

  it("checks the Stripe signature and reads the period end", () => {
    const payload = '{"id":"evt_1"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${payload}`).digest("hex");
    expect(verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, "whsec_test")).toBe(true);
    expect(verifyStripeSignature(payload, `t=${timestamp},v1=deadbeef`, "whsec_test")).toBe(false);
    expect(subscriptionPeriodEnd({ current_period_end: 1_700_000_000 })).toBe(1_700_000_000);
    expect(subscriptionPeriodEnd({ items: { data: [{ current_period_end: 42 }] } })).toBe(42);
  });
});
