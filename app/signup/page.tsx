"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createBrowserSupabase();

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-8">
      <BrandMark className="mb-4 self-center" />
      <h1 className="font-display text-5xl">Sign up</h1>
      <p className="mt-2 text-sm text-cream/70">New accounts start at 1200 rating.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!supabase) {
            setError("Accounts need Supabase to be configured.");
            return;
          }
          setBusy(true);
          setError(null);
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: username.toLowerCase(),
                display_name: displayName || username,
              },
            },
          });
          setBusy(false);
          if (signUpError) {
            setError(signUpError.message);
            return;
          }
          setNotice("Account created. If email confirmation is on, check your inbox, then log in.");
        }}
      >
        <label className="block text-sm">
          Username
          <input
            required
            minLength={2}
            maxLength={16}
            pattern="[A-Za-z0-9_]{2,16}"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
          />
        </label>
        <label className="block text-sm">
          Display name
          <input
            required
            minLength={2}
            maxLength={24}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
          />
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {notice && <p className="text-sm text-gold">{notice}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          Create account
        </Button>
        <Link href="/login" className="block text-center text-sm text-cream/70">
          Already have an account
        </Link>
      </form>
    </main>
  );
}
