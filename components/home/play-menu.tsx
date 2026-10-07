"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { BrandMark } from "@/components/brand/brand-mark";
import { authHeaders, createBrowserSupabase } from "@/lib/supabase/browser";
import { rankTitle } from "@/lib/ui/ranks";

interface Me {
  profile: {
    displayName: string;
    username: string;
    rating: number;
    rank: string;
  } | null;
}

export function PlayMenu() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    void (async () => {
      const headers = await authHeaders();
      const response = await fetch("/api/me", { headers, cache: "no-store" });
      setMe((await response.json()) as Me);
    })();
  }, []);

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center overflow-y-auto py-8 text-center">
      <h1>
        <BrandMark size="hero" />
      </h1>
      <p className="mt-2 max-w-sm text-cream/75">The lower your hand, the better your chances.</p>
      {me?.profile && (
        <Link href="/profile" className="mt-4 rounded-2xl border border-[var(--line)] px-4 py-2 text-sm">
          <span className="block font-extrabold">{me.profile.displayName}</span>
          <span className="text-gold">
            Rating {me.profile.rating} · {me.profile.rank || rankTitle(me.profile.rating)}
          </span>
        </Link>
      )}
      <div className="mt-6 flex w-full flex-col gap-3">
        <Link href="/lobby/create" className="focus-ring rounded-full bg-[var(--gold)] py-3 font-extrabold text-ink shadow-[0_5px_0_var(--gold-shadow)]">
          Play With Friends
        </Link>
        <Link href="/play/random" className="focus-ring rounded-full bg-[var(--accent)] py-3 font-extrabold text-ink shadow-[0_5px_0_var(--accent-shadow)]">
          Play Random
        </Link>
        <Link href="/play/ranked" className="focus-ring rounded-full border border-[var(--gold)] py-3 font-extrabold text-gold">
          Ranked
        </Link>
        <Link href="/play/bots" className="focus-ring rounded-full border border-[var(--line)] py-3 font-extrabold">
          Play vs Bots
        </Link>
        <div className="flex justify-center gap-4 text-sm">
          <Link href="/rankings" className="text-gold">
            Rankings
          </Link>
          <Link href="/rules" className="text-cream/70">
            How to Play
          </Link>
          {me?.profile ? (
            <button
              className="text-cream/70"
              onClick={async () => {
                await createBrowserSupabase()?.auth.signOut();
                setMe({ profile: null });
                router.push("/");
                router.refresh();
              }}
            >
              Log out
            </button>
          ) : (
            <Link href="/login" className="text-cream/70">
              Log in
            </Link>
          )}
        </div>
      </div>
      <div className="mt-6 w-full">
        <AdSlot placement="home" />
      </div>
    </main>
  );
}
