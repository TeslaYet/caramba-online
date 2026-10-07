"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { authHeaders } from "@/lib/supabase/browser";

export function QueueScreen({ mode }: { mode: "casual" | "ranked" }) {
  const router = useRouter();
  const [playersFound, setPlayersFound] = useState(0);
  const [matched, setMatched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ranked = mode === "ranked";

  useEffect(() => {
    let stopped = false;
    async function poll() {
      const headers = await authHeaders();
      const response = await fetch("/api/matchmaking", { headers, cache: "no-store" });
      const data = await response.json();
      if (stopped) {
        return;
      }
      if (!response.ok) {
        setError(data.error ?? "Sign in to queue.");
        return;
      }
      setPlayersFound(data.playersFound ?? 0);
      if (data.status === "matched" && data.code) {
        setMatched(true);
        window.setTimeout(() => router.push(`/room/${data.code}`), 700);
        return;
      }
      window.setTimeout(() => void poll(), 2000);
    }
    void (async () => {
      const headers = await authHeaders();
      const response = await fetch("/api/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ mode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not join the queue.");
        return;
      }
      if (data.status === "matched" && data.code) {
        setMatched(true);
        setPlayersFound(data.playersFound ?? 0);
        window.setTimeout(() => router.push(`/room/${data.code}`), 700);
        return;
      }
      setPlayersFound(data.playersFound ?? 0);
      void poll();
    })();
    return () => {
      stopped = true;
    };
  }, [mode, router]);

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-8 text-center">
      <BrandMark className="mb-4 self-center" />
      <p className="text-sm uppercase tracking-[0.28em] text-gold">{ranked ? "Ranked" : "Casual"}</p>
      <h1 className="font-display text-5xl">{matched ? "Match found" : "Finding players..."}</h1>
      <p className="mt-3 text-cream/75">
        {matched ? "Entering game..." : `Players found: ${playersFound}`}
      </p>
      {!matched && <p className="mt-1 text-sm text-cream/60">Waiting for more players...</p>}
      <p className="mt-4 text-sm text-cream/70">
        {ranked
          ? "This game changes your rating and appears on the rankings."
          : "Casual games do not change your rating."}
      </p>
      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      {!matched && (
        <Button
          className="mt-6"
          variant="secondary"
          onClick={async () => {
            const headers = await authHeaders();
            await fetch("/api/matchmaking/leave", { method: "POST", headers });
            router.push("/");
          }}
        >
          Cancel
        </Button>
      )}
      {error && (
        <Link href="/login" className="mt-4 text-gold">
          Log in
        </Link>
      )}
      <div className="mt-8">
        <AdSlot placement="queue" />
      </div>
    </main>
  );
}
