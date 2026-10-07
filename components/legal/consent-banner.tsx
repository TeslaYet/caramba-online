"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { authHeaders } from "@/lib/supabase/browser";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, parseConsent, type ConsentChoice } from "@/lib/ui/consent";

function subscribe(onChange: () => void) {
  window.addEventListener("caramba-consent", onChange);
  return () => window.removeEventListener("caramba-consent", onChange);
}

export function ConsentBanner() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const storedRaw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(CONSENT_STORAGE_KEY) ?? "",
    () => "",
  );
  const [manage, setManage] = useState(false);

  if (!mounted || pathname.startsWith("/room") || pathname.startsWith("/game")) {
    return null;
  }

  const choice = parseConsent(storedRaw || null);

  async function save(advertising: boolean) {
    const next: ConsentChoice = { version: CONSENT_VERSION, advertising, decidedAt: Date.now() };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    setManage(false);
    window.dispatchEvent(new Event("caramba-consent"));
    const headers = await authHeaders();
    await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ advertising }),
    }).catch(() => undefined);
  }

  if (choice && !manage) {
    return (
      <button
        type="button"
        onClick={() => setManage(true)}
        className="focus-ring fixed bottom-3 left-3 z-30 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-cream/80"
      >
        Cookie choices
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-xl [@media(max-height:520px)]:p-3"
    >
      <h2 id="consent-title" className="font-display text-2xl">
        Cookies
      </h2>
      <p className="mt-2 text-sm text-cream/80">
        Carramba uses a necessary cookie to keep you in a game. Advertising cookies are off until you accept
        them. You can refuse and still play.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void save(false)}
          className="focus-ring min-h-11 rounded-full border border-[var(--line)] px-4 py-2 text-sm"
        >
          Refuse advertising
        </button>
        <button
          type="button"
          onClick={() => void save(true)}
          className="focus-ring min-h-11 rounded-full border border-[var(--line)] px-4 py-2 text-sm"
        >
          Accept advertising
        </button>
      </div>
      <p className="mt-3 text-xs text-cream/60">
        <a className="underline" href="/legal/cookies">
          Cookie notice
        </a>
        {" · "}
        <a className="underline" href="/legal/privacy">
          Privacy
        </a>
      </p>
    </div>
  );
}
