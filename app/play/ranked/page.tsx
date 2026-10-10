"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { QueueScreen } from "@/components/play/queue-screen";
import { Button } from "@/components/ui/button";

const SIZES = [2, 3, 4, 5, 6, 7, 8] as const;

export default function RankedPage() {
  const [chosen, setChosen] = useState(4);
  const [searching, setSearching] = useState(false);

  if (searching) {
    return <QueueScreen mode="ranked" playerCount={chosen} />;
  }

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-8">
      <BrandMark className="mb-4 self-center" />
      <p className="text-sm uppercase tracking-[0.28em] text-gold">Ranked</p>
      <h1 className="font-display text-5xl">Choose a table</h1>
      <p className="mt-2 text-sm text-cream/70">
        Matchmaking looks for players who want this exact number of humans. A 4-player search will not start a 3-player game.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {SIZES.map((option) => (
          <Button
            key={option}
            type="button"
            variant={chosen === option ? "gold" : "secondary"}
            onClick={() => setChosen(option)}
          >
            {option} players
          </Button>
        ))}
      </div>
      <p className="mt-4 text-sm text-cream/75">
        {chosen === 2 ? "1v1. Two human players." : `${chosen} human players at one table.`}
      </p>
      <Button
        className="mt-4 w-full"
        onClick={() => setSearching(true)}
      >
        Search for {chosen} players
      </Button>
      <p className="mt-4 text-sm text-cream/70">
        Ranked games share one rating across every table size. Bot games and private team games do not change it.
      </p>
      <Link href="/" className="mt-4 text-center text-sm text-cream/60">
        Back
      </Link>
    </main>
  );
}
