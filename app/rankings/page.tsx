"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { BrandMark } from "@/components/brand/brand-mark";
import { authHeaders } from "@/lib/supabase/browser";

interface Row {
  rank: number;
  displayName: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
}

export default function RankingsPage() {
  const [scope, setScope] = useState<"global" | "friends">("global");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void (async () => {
      const headers = await authHeaders();
      const response = await fetch(`/api/rankings?scope=${scope}`, { headers, cache: "no-store" });
      const data = await response.json();
      setRows(data.rankings ?? []);
    })();
  }, [scope]);

  return (
    <main className="safe-screen mx-auto min-h-dvh w-full max-w-2xl py-8">
      <BrandMark className="mb-4" />
      <h1 className="font-display text-5xl">Rankings</h1>
      <p className="mt-2 text-sm text-cream/70">Ranked games only. Casual, private, and bot games stay off this list.</p>
      <div className="mt-4 flex gap-2">
        <button className={scope === "global" ? "text-gold" : "text-cream/60"} onClick={() => setScope("global")}>
          Global
        </button>
        <button className={scope === "friends" ? "text-gold" : "text-cream/60"} onClick={() => setScope("friends")}>
          Friends
        </button>
      </div>
      <ol className="mt-6 space-y-2">
        {rows.map((row) => (
          <li key={row.username} className="grid grid-cols-[3rem_minmax(0,1fr)_4rem_3rem_3rem] items-center gap-2 rounded-2xl border border-[var(--line)] px-3 py-2">
            <span className="font-display text-xl text-gold">#{row.rank}</span>
            <span className="truncate font-extrabold">{row.displayName}</span>
            <span className="text-right tabular-nums">{row.rating}</span>
            <span className="text-right text-sm text-cream/60">{row.gamesPlayed}</span>
            <span className="text-right text-sm text-cream/60">{row.wins}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-cream/60">No ranked players yet.</li>}
      </ol>
      <div className="mt-3 grid grid-cols-[3rem_minmax(0,1fr)_4rem_3rem_3rem] px-3 text-[10px] uppercase tracking-[0.14em] text-cream/40">
        <span>Rank</span>
        <span>Player</span>
        <span className="text-right">Rating</span>
        <span className="text-right">Games</span>
        <span className="text-right">Wins</span>
      </div>
      <div className="mt-8">
        <AdSlot placement="rankings" />
      </div>
      <Link href="/" className="mt-6 inline-block text-gold">
        Back
      </Link>
    </main>
  );
}
