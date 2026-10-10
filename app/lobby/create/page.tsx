"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { BrandMark } from "@/components/brand/brand-mark";
import { ScoreFields } from "@/components/lobby/score-fields";
import { Button } from "@/components/ui/button";

export default function CreateLobbyPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [resetScore, setResetScore] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-8">
      <BrandMark className="mb-4 self-center" />
      <p className="text-sm uppercase tracking-[0.3em] text-gold">Private table</p>
      <h1 className="font-display text-5xl">Play With Friends</h1>
      <p className="mt-2 text-sm text-cream/70">
        No account needed. Private games do not change rating. After the room opens, the host can keep individual play or switch to a 2v2, 3v3, or 4v4 team game.
      </p>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          const response = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname, maxScore, resetScore }),
          });
          const data = await response.json();
          setBusy(false);
          if (!response.ok) {
            setError(data.error ?? "Could not create the room.");
            return;
          }
          router.push(`/room/${data.room.code}`);
        }}
      >
        <label className="block text-sm">
          Nickname
          <input
            required
            minLength={2}
            maxLength={16}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
            data-testid="nickname-input"
          />
        </label>
        <ScoreFields
          maxScore={maxScore}
          resetScore={resetScore}
          onMaxScore={setMaxScore}
          onResetScore={setResetScore}
        />
        <p className="text-xs text-cream/60">
          These lock when the host starts the game. An exact maximum returns to the reset score.
          Going over eliminates the player.
        </p>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full" data-testid="create-room">
          Create room
        </Button>
        <Link href="/lobby/join" className="block text-center text-sm text-gold">
          Join with a code
        </Link>
        <Link href="/" className="block text-center text-sm text-cream/60">
          Back
        </Link>
      </form>
      <div className="mt-6">
        <AdSlot placement="lobby" />
      </div>
    </main>
  );
}
