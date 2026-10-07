export const CONSENT_VERSION = "2026-10-07";
export const CONSENT_STORAGE_KEY = "caramba-consent";

export interface ConsentChoice {
  version: string;
  advertising: boolean;
  decidedAt: number;
}

export function parseConsent(raw: string | null): ConsentChoice | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as Partial<ConsentChoice>;
    if (value.version !== CONSENT_VERSION || typeof value.advertising !== "boolean") {
      return null;
    }
    return {
      version: value.version,
      advertising: value.advertising,
      decidedAt: typeof value.decidedAt === "number" ? value.decidedAt : 0,
    };
  } catch {
    return null;
  }
}

export function isAdSenseClientId(value: string | undefined): value is string {
  return Boolean(value && /^ca-pub-\d{10,20}$/.test(value));
}

export function isAdSenseSlotId(value: string | undefined): value is string {
  return Boolean(value && /^\d{6,20}$/.test(value));
}

/**
 * Third-party ad scripts load only after an explicit advertising choice,
 * a free entitlement, and real publisher ids. A missing choice is a refusal.
 */
export function adsScriptAllowed(input: {
  showAds: boolean;
  consent: ConsentChoice | null;
  clientId: string | undefined;
  slotId: string | undefined;
}): boolean {
  return (
    input.showAds &&
    input.consent?.advertising === true &&
    input.consent.version === CONSENT_VERSION &&
    isAdSenseClientId(input.clientId) &&
    isAdSenseSlotId(input.slotId)
  );
}
