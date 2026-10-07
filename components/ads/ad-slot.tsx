"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { authHeaders } from "@/lib/supabase/browser";
import {
  adsScriptAllowed,
  CONSENT_STORAGE_KEY,
  isAdSenseClientId,
  parseConsent,
} from "@/lib/ui/consent";

const CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;

function subscribe(onChange: () => void) {
  window.addEventListener("caramba-consent", onChange);
  return () => window.removeEventListener("caramba-consent", onChange);
}

export function AdSlot({ placement }: { placement: string }) {
  const [showAds, setShowAds] = useState(true);
  const storedRaw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(CONSENT_STORAGE_KEY) ?? "",
    () => "",
  );
  const consent = parseConsent(storedRaw || null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const headers = await authHeaders();
        const response = await fetch("/api/me", { headers, cache: "no-store" });
        const data = (await response.json()) as { showAds?: boolean };
        if (!cancelled) {
          setShowAds(data.showAds !== false);
        }
      } catch {
        if (!cancelled) {
          setShowAds(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowed = adsScriptAllowed({
    showAds,
    consent,
    clientId: CLIENT_ID,
    slotId: SLOT_ID,
  });

  useEffect(() => {
    if (!allowed || !CLIENT_ID) {
      return;
    }
    const existing = document.querySelector("script[data-adsense='carramba']");
    if (!existing) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
      script.crossOrigin = "anonymous";
      script.dataset.adsense = "carramba";
      document.head.appendChild(script);
    }
    const ads = (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle ?? [];
    ads.push({});
    (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = ads;
  }, [allowed]);

  if (!showAds) {
    return null;
  }

  if (!isAdSenseClientId(CLIENT_ID)) {
    return (
      <aside
        data-testid={`ad-${placement}`}
        className="mx-auto w-full max-w-md rounded-2xl border border-dashed border-[var(--line)] bg-black/20 px-4 py-3 text-center text-xs text-cream/60"
        aria-label="Advertisement"
      >
        <p className="uppercase tracking-[0.22em]">Advertisement</p>
        <p className="mt-1">Carramba stays free. Ads never sit on the table.</p>
      </aside>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <aside data-testid={`ad-${placement}`} className="mx-auto w-full max-w-md" aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={SLOT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
