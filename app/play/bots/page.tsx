"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

const LEVELS = ["easy", "normal", "hard", "expert"] as const;

export default function BotsPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof LEVELS)[number]>("normal");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-8">
      <BrandMark className="mb-4 self-center" />
      <h1 className="font-display text-5xl">Play vs Bots</h1>
      <p className="mt-2 text-sm text-cream/70">
        Practice does not change your rating, rankings, or competitive record. Bots only see what a player would see.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          const response = await fetch("/api/play/bots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname, difficulty }),
          });
          const data = await response.json();
          setBusy(false);
          if (!response.ok) {
            setError(data.error ?? "Could not start the practice game.");
            return;
          }
          router.push(`/room/${data.code}`);
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
          />
        </label>
        <label className="block text-sm">
          Difficulty
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as (typeof LEVELS)[number])}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
            data-testid="bot-difficulty"
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level[0]?.toUpperCase()}
                {level.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          Start practice
        </Button>
        <Link href="/" className="block text-center text-sm text-cream/60">
          Back
        </Link>
      </form>
    </main>
  );
}
