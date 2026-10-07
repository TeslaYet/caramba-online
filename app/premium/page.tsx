"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { authHeaders } from "@/lib/supabase/browser";

interface Plan {
  entitlement: string;
  entitlementSource: string;
  entitlementExpiresAt: string | null;
}

export default function PremiumPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const headers = await authHeaders();
      const response = await fetch("/api/me", { headers, cache: "no-store" });
      const data = await response.json();
      if (!cancelled) {
        setSignedIn(Boolean(data.profile));
        setPlan(data.profile);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openBilling(path: string) {
    const headers = await authHeaders();
    const response = await fetch(path, { method: "POST", headers });
    const data = await response.json();
    if (!response.ok || typeof data.url !== "string") {
      setMessage(data.error ?? "Billing is not available.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col py-10">
      <BrandMark className="mb-4 self-center" />
      <h1 className="text-center font-display text-5xl">Carramba Premium</h1>
      <p className="mt-3 text-center text-sm text-cream/70">No ads. The game stays the same.</p>
      <p className="mt-6 text-center text-sm">
        Current plan: {plan?.entitlement ?? (signedIn ? "Free" : "Sign in to see your plan")}
        {plan?.entitlementExpiresAt ? ` · renews or ends ${new Date(plan.entitlementExpiresAt).toLocaleDateString()}` : ""}
      </p>
      {plan?.entitlementSource === "manual" && (
        <p className="mt-2 text-center text-sm text-cream/70">This ad-free access was granted manually.</p>
      )}
      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={() => void openBilling("/api/billing/checkout")}>Subscribe</Button>
        <Button variant="secondary" onClick={() => void openBilling("/api/billing/portal")}>
          Manage or cancel subscription
        </Button>
      </div>
      {message && <p className="mt-4 text-center text-sm text-cream/70">{message}</p>}
      <p className="mt-6 text-center text-xs text-cream/60">
        <Link href="/legal/premium" className="underline">
          Premium terms
        </Link>
        . Cancellation uses Stripe’s portal. Carramba does not add an extra step.
      </p>
    </main>
  );
}
