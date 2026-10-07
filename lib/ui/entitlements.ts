export type Entitlement = "FREE" | "AD_FREE" | "PREMIUM";

export function canShowAds(entitlement: Entitlement | null | undefined): boolean {
  return entitlement !== "AD_FREE" && entitlement !== "PREMIUM";
}

/** A paid cancellation must not remove a manual friend grant. */
export function keepManualGrant(
  currentSource: string | null | undefined,
  nextSource: string,
  nextEntitlement: Entitlement,
): boolean {
  return currentSource === "manual" && nextSource === "stripe" && nextEntitlement === "FREE";
}
