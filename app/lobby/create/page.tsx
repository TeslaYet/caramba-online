"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateLobbyPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-sm uppercase tracking-[0.3em] text-gold">New table</p>
      <h1 className="font-display text-5xl">Create Game</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          const response = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname }),
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
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full" data-testid="create-room">
          Create room
        </Button>
        <Link href="/" className="block text-center text-sm text-cream/60">
          Back
        </Link>
      </form>
    </main>
  );
}
