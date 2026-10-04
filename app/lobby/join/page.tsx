"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState(params.get("code") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        const response = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname, code }),
        });
        const data = await response.json();
        setBusy(false);
        if (!response.ok) {
          setError(data.error ?? "Could not join that room.");
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
      <label className="block text-sm">
        Room code
        <input
          required
          minLength={6}
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3 tracking-[0.3em]"
          data-testid="code-input"
        />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full" data-testid="join-room">
        Join room
      </Button>
      <Link href="/" className="block text-center text-sm text-cream/60">
        Back
      </Link>
    </form>
  );
}

export default function JoinLobbyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-sm uppercase tracking-[0.3em] text-gold">Sit down</p>
      <h1 className="font-display text-5xl">Join Game</h1>
      <Suspense>
        <JoinForm />
      </Suspense>
    </main>
  );
}
