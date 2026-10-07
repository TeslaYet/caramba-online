"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { authHeaders, createBrowserSupabase } from "@/lib/supabase/browser";
import { winRate } from "@/lib/ui/ranks";

interface ProfileView {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  rank: string;
  gamesPlayed: number;
  wins: number;
  entitlement?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [requests, setRequests] = useState<{ username: string; displayName: string }[]>([]);
  const [friend, setFriend] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const headers = await authHeaders();
    const response = await fetch("/api/me", { headers, cache: "no-store" });
    const data = await response.json();
    setProfile(data.profile);
    setDisplayName(data.profile?.displayName ?? "");
    setRequests(data.requests ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const headers = await authHeaders();
      const response = await fetch("/api/me", { headers, cache: "no-store" });
      const data = await response.json();
      if (!cancelled) {
        setProfile(data.profile);
        setDisplayName(data.profile?.displayName ?? "");
        setRequests(data.requests ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) {
    return (
      <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center text-center">
        <p>Sign in to see your profile.</p>
        <Link href="/login" className="mt-4 text-gold">
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col py-8">
      <BrandMark className="mb-4 self-center" />
      <h1 className="text-center font-display text-5xl">{profile.displayName}</h1>
      <p className="text-center text-sm text-cream/60">@{profile.username}</p>
      {profile.avatarUrl && /^https:\/\/[^\s"'()]+$/.test(profile.avatarUrl) && (
        <div
          className="mx-auto mt-3 h-16 w-16 rounded-full bg-cover bg-center"
          style={{ backgroundImage: `url(${profile.avatarUrl})` }}
          role="img"
          aria-label=""
        />
      )}
      <dl className="mt-6 grid grid-cols-2 gap-3 text-center">
        <Stat label="Rating" value={String(profile.rating)} />
        <Stat label="Rank" value={profile.rank} />
        <Stat label="Games played" value={String(profile.gamesPlayed)} />
        <Stat label="Wins" value={String(profile.wins)} />
        <Stat label="Win rate" value={`${winRate(profile.wins, profile.gamesPlayed)}%`} />
      </dl>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const headers = await authHeaders();
          const response = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ displayName }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "Could not save.");
            return;
          }
          setError(null);
          await load();
        }}
      >
        <label className="block text-sm">
          Display name
          <input
            value={displayName}
            minLength={2}
            maxLength={24}
            onChange={(event) => setDisplayName(event.target.value)}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
          />
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit">Save profile</Button>
      </form>
      <section className="mt-8">
        <h2 className="font-display text-2xl">Friends</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const headers = await authHeaders();
            await fetch("/api/friends", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({ username: friend }),
            });
            setFriend("");
          }}
        >
          <input
            value={friend}
            onChange={(event) => setFriend(event.target.value)}
            placeholder="Username"
            className="focus-ring min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
          />
          <Button type="submit" variant="secondary">
            Add
          </Button>
        </form>
        <ul className="mt-3 space-y-2">
          {requests.map((request) => (
            <li key={request.username} className="flex items-center justify-between gap-2">
              <span>{request.displayName}</span>
              <Button
                variant="secondary"
                onClick={async () => {
                  const headers = await authHeaders();
                  await fetch("/api/friends", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...headers },
                    body: JSON.stringify({ username: request.username, accept: true }),
                  });
                  await load();
                }}
              >
                Accept
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8 space-y-3">
        <h2 className="font-display text-2xl">Your data</h2>
        <p className="text-sm text-cream/70">
          Plan: {profile.entitlement ?? "FREE"}.{" "}
          <Link href="/premium" className="text-gold underline">
            Premium
          </Link>
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            const headers = await authHeaders();
            const response = await fetch("/api/account/export", { headers });
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "carramba-export.json";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download my data
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            const typed = window.prompt('Type DELETE to anonymize this account. Your public name becomes "Deleted Player". Match history stays.');
            if (typed !== "DELETE") {
              return;
            }
            const headers = await authHeaders();
            const response = await fetch("/api/account/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({ confirm: "DELETE" }),
            });
            const data = await response.json();
            if (!response.ok) {
              setError(data.error ?? "Could not delete the account.");
              return;
            }
            await createBrowserSupabase()?.auth.signOut();
            router.push("/");
          }}
        >
          Delete account
        </Button>
      </section>
      <div className="mt-8">
        <AdSlot placement="profile" />
      </div>
      <Link href="/" className="mt-6 text-gold">
        Back
      </Link>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-cream/50">{label}</dt>
      <dd className="font-display text-3xl text-gold">{value}</dd>
    </div>
  );
}
